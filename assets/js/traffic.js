import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  doc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const DAY_STORAGE_KEY = 'relim:traffic:day:v1';
const TOTAL_STORAGE_KEY = 'relim:traffic:total:v1';
const EXCLUDED_PAGES = new Set(['admin.html']);

const currentPage = window.location.pathname.split('/').pop() || 'index.html';

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

function canUseLocalStorage() {
  try {
    const testKey = '__relim_traffic_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

async function incrementDay(db, dayKey) {
  if (localStorage.getItem(DAY_STORAGE_KEY) === dayKey) return;

  await setDoc(doc(db, 'trafficDays', dayKey), {
    dayKey,
    count: increment(1),
    updatedAt: serverTimestamp()
  }, { merge: true });

  localStorage.setItem(DAY_STORAGE_KEY, dayKey);
}

async function incrementTotal(db) {
  if (localStorage.getItem(TOTAL_STORAGE_KEY) === 'counted') return;

  await setDoc(doc(db, 'trafficSummary', 'total'), {
    scope: 'total',
    count: increment(1),
    updatedAt: serverTimestamp()
  }, { merge: true });

  localStorage.setItem(TOTAL_STORAGE_KEY, 'counted');
}

async function trackVisitor() {
  if (!firebaseReady || EXCLUDED_PAGES.has(currentPage) || !canUseLocalStorage()) return;

  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const dayKey = getKstDateKey();

  const tasks = [];
  if (localStorage.getItem(DAY_STORAGE_KEY) !== dayKey) tasks.push(incrementDay(db, dayKey));
  if (localStorage.getItem(TOTAL_STORAGE_KEY) !== 'counted') tasks.push(incrementTotal(db));

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}

trackVisitor().catch((error) => console.warn('[RE:LIM TRAFFIC]', error));
