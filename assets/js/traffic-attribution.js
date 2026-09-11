import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const STORAGE_KEY = 'relim:attribution:session:v1';
const SESSION_WINDOW = 30 * 60 * 1000;
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

function safeText(value, max = 160) {
  return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function readRecentSession() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!data || !Number.isFinite(data.ts)) return null;
    if (Date.now() - data.ts > SESSION_WINDOW) return null;
    return data;
  } catch {
    return null;
  }
}

function saveSession(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), source: payload.source, campaign: payload.campaign }));
  } catch {}
}

function getReferrerHost() {
  if (!document.referrer) return '';
  try { return new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}

function getDevice() {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function getBrowser() {
  const ua = navigator.userAgent || '';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Whale\//i.test(ua)) return 'Whale';
  if (/SamsungBrowser\//i.test(ua)) return 'Samsung Internet';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  return 'Other';
}

function classifyKnownHost(host) {
  if (!host) return null;
  if (/(^|\.)google\./i.test(host)) return { channel: 'Organic Search', source: 'Google', medium: 'organic' };
  if (/(^|\.)naver\.com$/i.test(host)) return { channel: 'Organic Search', source: 'Naver', medium: 'organic' };
  if (/(^|\.)daum\.net$|(^|\.)kakao\.com$/i.test(host)) return { channel: 'Organic Search', source: 'Daum', medium: 'organic' };
  if (/(^|\.)bing\.com$/i.test(host)) return { channel: 'Organic Search', source: 'Bing', medium: 'organic' };
  if (/instagram\.com$/i.test(host)) return { channel: 'Social', source: 'Instagram', medium: 'social' };
  if (/facebook\.com$|fb\.com$/i.test(host)) return { channel: 'Social', source: 'Facebook', medium: 'social' };
  if (/threads\.net$/i.test(host)) return { channel: 'Social', source: 'Threads', medium: 'social' };
  if (/t\.co$|twitter\.com$|x\.com$/i.test(host)) return { channel: 'Social', source: 'X', medium: 'social' };
  if (/youtube\.com$|youtu\.be$/i.test(host)) return { channel: 'Social', source: 'YouTube', medium: 'social' };
  if (/kakao\.com$|kakaotalk/i.test(host)) return { channel: 'Social', source: 'Kakao', medium: 'social' };
  return { channel: 'Referral', source: host, medium: 'referral' };
}

function classifyCampaign(params) {
  const utmSource = safeText(params.get('utm_source'), 80);
  const utmMedium = safeText(params.get('utm_medium'), 80).toLowerCase();
  const campaign = safeText(params.get('utm_campaign'), 120);
  const gclid = params.get('gclid');
  const fbclid = params.get('fbclid');

  if (gclid && !utmSource) return { channel: 'Paid', source: 'Google Ads', medium: 'cpc', campaign: campaign || 'gclid' };
  if (fbclid && !utmSource) return { channel: 'Paid', source: 'Meta Ads', medium: 'paid_social', campaign: campaign || 'fbclid' };
  if (!utmSource) return null;

  let channel = 'Campaign';
  if (/cpc|ppc|paid|display|cpm/.test(utmMedium)) channel = 'Paid';
  else if (/social|instagram|facebook|threads/.test(utmMedium)) channel = 'Social';
  else if (/email|newsletter/.test(utmMedium)) channel = 'Campaign';
  else if (/organic/.test(utmMedium)) channel = 'Organic Search';

  return {
    channel,
    source: utmSource,
    medium: utmMedium || 'campaign',
    campaign
  };
}

function buildAttribution() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const campaignInfo = classifyCampaign(params);
  const referrerHost = getReferrerHost();
  const ownHost = window.location.hostname.replace(/^www\./, '').toLowerCase();

  if (!campaignInfo && referrerHost && referrerHost === ownHost) return null;

  const base = campaignInfo || classifyKnownHost(referrerHost) || { channel: 'Direct', source: 'Direct', medium: 'direct' };
  return {
    dayKey: getKstDateKey(),
    channel: safeText(base.channel, 40),
    source: safeText(base.source, 100),
    medium: safeText(base.medium, 80),
    campaign: safeText(base.campaign || '', 120),
    referrerHost: safeText(referrerHost, 140),
    landingPath: safeText(`${window.location.pathname || '/'}${params.toString() ? `?${[...params.entries()].filter(([key]) => !['gclid','fbclid'].includes(key)).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}` : ''}`, 240),
    device: getDevice(),
    browser: getBrowser()
  };
}

function hashString(value) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

async function trackAttribution() {
  if (!firebaseReady || EXCLUDED_PAGES.has(currentPage) || readRecentSession()) return;
  const attribution = buildAttribution();
  if (!attribution) return;

  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const signature = [
    attribution.dayKey,
    attribution.channel,
    attribution.source,
    attribution.medium,
    attribution.campaign,
    attribution.referrerHost,
    attribution.landingPath,
    attribution.device,
    attribution.browser
  ].join('|');
  const recordRef = doc(db, 'trafficAttribution', `${attribution.dayKey}_${hashString(signature)}`);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(recordRef);
    if (snapshot.exists()) {
      transaction.update(recordRef, {
        count: Math.max(0, Number(snapshot.data().count) || 0) + 1,
        updatedAt: serverTimestamp()
      });
    } else {
      transaction.set(recordRef, {
        ...attribution,
        count: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  });

  saveSession(attribution);
}

trackAttribution().catch((error) => console.warn('[RE:LIM ATTRIBUTION]', error));
