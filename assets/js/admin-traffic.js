import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com']);
const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const todayElement = document.querySelector('[data-stat-traffic-today]');
const weekElement = document.querySelector('[data-stat-traffic-week]');
const totalElement = document.querySelector('[data-stat-traffic-total]');
const noteElement = document.querySelector('[data-traffic-note]');

let dailyCounts = new Map();
let totalCount = 0;
let unsubscribers = [];

function getKstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getRecentDateKeys(days = 7) {
  const keys = [];
  const now = new Date();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now.getTime() - (offset * 24 * 60 * 60 * 1000));
    keys.push(getKstDateKey(date));
  }
  return keys;
}

function formatCount(value) {
  return new Intl.NumberFormat('ko-KR').format(Math.max(0, Number(value) || 0));
}

function renderTraffic() {
  const todayKey = getKstDateKey();
  const today = dailyCounts.get(todayKey) || 0;
  const last7Days = getRecentDateKeys(7).reduce((sum, key) => sum + (dailyCounts.get(key) || 0), 0);

  if (todayElement) todayElement.textContent = formatCount(today);
  if (weekElement) weekElement.textContent = formatCount(last7Days);
  if (totalElement) totalElement.textContent = formatCount(totalCount);
  if (noteElement) noteElement.textContent = `기준 ${todayKey} · 브라우저 중복 방문 제외`;
}

function startTrafficDashboard() {
  unsubscribers.forEach((unsubscribe) => unsubscribe?.());

  unsubscribers = [
    onSnapshot(collection(db, 'trafficDays'), (snapshot) => {
      dailyCounts = new Map(snapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data();
        return [data.dayKey || snapshotDoc.id, Number(data.count) || 0];
      }));
      renderTraffic();
    }, (error) => {
      console.error('[RE:LIM ADMIN TRAFFIC DAYS]', error);
      if (noteElement) noteElement.textContent = '방문자 집계 권한을 확인해 주세요.';
    }),
    onSnapshot(doc(db, 'trafficSummary', 'total'), (snapshot) => {
      totalCount = snapshot.exists() ? (Number(snapshot.data()?.count) || 0) : 0;
      renderTraffic();
    }, (error) => {
      console.error('[RE:LIM ADMIN TRAFFIC TOTAL]', error);
      if (noteElement) noteElement.textContent = '방문자 집계 권한을 확인해 주세요.';
    })
  ];
}

if (auth && db) {
  onAuthStateChanged(auth, (user) => {
    const email = String(user?.email || '').toLowerCase();
    if (user && ADMIN_EMAILS.has(email)) startTrafficDashboard();
  });
}
