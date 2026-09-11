import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { collection, getFirestore, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com', 'penury@naver.com']);
const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const state = { rows: [], range: 30 };

function injectStyles() {
  if (document.querySelector('[data-attribution-admin-style]')) return;
  const style = document.createElement('style');
  style.dataset.attributionAdminStyle = '';
  style.textContent = `
    .admin-attribution-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
    .admin-attribution-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .admin-attribution-actions select{height:38px;padding:0 34px 0 11px;border:1px solid var(--admin-line);background:#fff;color:var(--admin-ink);font-size:10px;font-weight:700}
    .admin-attribution-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}
    .admin-attribution-grid .admin-stat-card{min-height:112px}
    .admin-attribution-columns{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
    .admin-attribution-bars{display:grid;gap:10px;padding:20px 22px}
    .admin-attribution-bar{display:grid;grid-template-columns:86px minmax(0,1fr) 46px;gap:10px;align-items:center}
    .admin-attribution-bar small{font-size:9px;color:var(--admin-soft)}
    .admin-attribution-track{height:7px;background:#edf0eb;overflow:hidden}
    .admin-attribution-fill{height:100%;background:var(--admin-green);min-width:2px}
    .admin-attribution-value{text-align:right;font-size:10px;font-weight:750}
    .admin-attribution-note{margin:0;padding:13px 16px;background:#f7f8f5;color:var(--admin-soft);font-size:10px;line-height:1.65;border-top:1px solid var(--admin-line)}
    .admin-attribution-empty{padding:52px 20px;text-align:center;color:var(--admin-soft);font-size:12px}
    @media(max-width:1100px){.admin-attribution-columns{grid-template-columns:1fr}.admin-attribution-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:620px){.admin-attribution-head{align-items:flex-start;flex-direction:column}.admin-attribution-grid{grid-template-columns:1fr 1fr}.admin-attribution-bar{grid-template-columns:70px minmax(0,1fr) 36px}}
  `;
  document.head.append(style);
}

function ensureUI() {
  if (document.querySelector('[data-admin-tab="analytics"]')) return;
  injectStyles();

  const nav = document.querySelector('.admin-nav');
  const dashboardRoot = document.querySelector('[data-admin-dashboard]');
  if (!nav || !dashboardRoot) return;

  const navButton = document.createElement('button');
  navButton.className = 'admin-nav-item';
  navButton.type = 'button';
  navButton.dataset.adminTab = 'analytics';
  navButton.innerHTML = '<span>07</span>유입경로 분석';
  nav.append(navButton);

  const view = document.createElement('section');
  view.className = 'admin-view';
  view.dataset.adminView = 'analytics';
  view.innerHTML = `
    <div class="admin-attribution-head">
      <div><p class="admin-eyebrow">ATTRIBUTION ANALYTICS</p><h2 style="margin:0;font-size:20px;letter-spacing:-.04em">유입경로 분석</h2></div>
      <div class="admin-attribution-actions">
        <select data-attribution-range aria-label="조회 기간">
          <option value="7">최근 7일</option>
          <option value="30" selected>최근 30일</option>
          <option value="90">최근 90일</option>
          <option value="all">전체</option>
        </select>
        <button class="admin-button" type="button" data-attribution-download>CSV 다운로드</button>
      </div>
    </div>

    <div class="admin-attribution-grid">
      <article class="admin-stat-card"><span>SESSIONS</span><strong data-attribution-total>0</strong><small>집계 세션</small></article>
      <article class="admin-stat-card"><span>ORGANIC</span><strong data-attribution-organic>0</strong><small>검색 유입</small></article>
      <article class="admin-stat-card"><span>SOCIAL</span><strong data-attribution-social>0</strong><small>SNS 유입</small></article>
      <article class="admin-stat-card"><span>DIRECT</span><strong data-attribution-direct>0</strong><small>직접 유입</small></article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><p class="admin-eyebrow">DAILY TREND</p><h2>일자별 세션</h2><p>선택 기간의 유입 세션 추이를 확인합니다.</p></div></div>
      <div class="admin-attribution-bars" data-attribution-trend></div>
      <div class="admin-attribution-empty" data-attribution-trend-empty hidden>아직 집계된 유입 데이터가 없습니다.</div>
    </section>

    <div class="admin-attribution-columns">
      <section class="admin-panel">
        <div class="admin-panel-head"><div><p class="admin-eyebrow">SOURCE / MEDIUM</p><h2>유입 소스</h2><p>검색, SNS, 광고, 외부 링크 등 유입 경로별 세션입니다.</p></div></div>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>채널</th><th>소스</th><th>매체</th><th>세션</th><th>비중</th></tr></thead><tbody data-attribution-source-table></tbody></table></div>
        <div class="admin-empty" data-attribution-source-empty hidden>유입 데이터가 없습니다.</div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel-head"><div><p class="admin-eyebrow">DEVICE</p><h2>접속 환경</h2><p>기기와 브라우저 기준으로 확인합니다.</p></div></div>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>기기</th><th>브라우저</th><th>세션</th></tr></thead><tbody data-attribution-device-table></tbody></table></div>
        <div class="admin-empty" data-attribution-device-empty hidden>접속 환경 데이터가 없습니다.</div>
      </section>
    </div>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><p class="admin-eyebrow">LANDING PAGE</p><h2>첫 진입 페이지</h2><p>방문자가 처음 도착한 페이지를 기준으로 집계합니다.</p></div></div>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>랜딩 페이지</th><th>세션</th><th>비중</th></tr></thead><tbody data-attribution-landing-table></tbody></table></div>
      <div class="admin-empty" data-attribution-landing-empty hidden>랜딩 페이지 데이터가 없습니다.</div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel-head"><div><p class="admin-eyebrow">CAMPAIGN</p><h2>UTM 캠페인</h2><p>utm_source / utm_medium / utm_campaign이 포함된 링크를 구분합니다.</p></div></div>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>캠페인</th><th>소스</th><th>매체</th><th>세션</th></tr></thead><tbody data-attribution-campaign-table></tbody></table></div>
      <div class="admin-empty" data-attribution-campaign-empty hidden>UTM 캠페인 데이터가 없습니다.</div>
      <p class="admin-attribution-note">유입경로 데이터는 이 기능 배포 이후부터 익명 집계됩니다. IP, 이름, 이메일 같은 개인식별정보는 저장하지 않습니다. 세션은 약 30분 기준으로 중복을 줄여 집계합니다.</p>
    </section>
  `;
  dashboardRoot.append(view);

  navButton.addEventListener('click', () => {
    document.querySelectorAll('[data-admin-view]').forEach((item) => item.classList.toggle('is-active', item.dataset.adminView === 'analytics'));
    document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.toggle('is-active', item.dataset.adminTab === 'analytics'));
    const title = document.querySelector('[data-page-title]');
    const description = document.querySelector('[data-page-description]');
    if (title) title.textContent = '유입경로 분석';
    if (description) description.textContent = '검색·SNS·직접 방문·외부 링크와 랜딩 페이지를 분석합니다.';
    document.body.classList.remove('admin-menu-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  view.querySelector('[data-attribution-range]')?.addEventListener('change', (event) => {
    state.range = event.target.value === 'all' ? 'all' : Number(event.target.value);
    render();
  });
  view.querySelector('[data-attribution-download]')?.addEventListener('click', downloadCsv);
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function filteredRows() {
  if (state.range === 'all') return state.rows;
  const boundary = new Date();
  boundary.setHours(0, 0, 0, 0);
  boundary.setDate(boundary.getDate() - Math.max(0, state.range - 1));
  const key = getDateKey(boundary);
  return state.rows.filter((row) => String(row.dayKey || '') >= key);
}

function sum(rows) {
  return rows.reduce((total, row) => total + Math.max(0, Number(row.count) || 0), 0);
}

function groupBy(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    const existing = map.get(key) || { count: 0, sample: row };
    existing.count += Math.max(0, Number(row.count) || 0);
    map.set(key, existing);
  });
  return [...map.entries()].map(([key, value]) => ({ key, ...value })).sort((a, b) => b.count - a.count);
}

function setCount(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = new Intl.NumberFormat('ko-KR').format(value);
}

function makeCell(text, className = '') {
  const td = document.createElement('td');
  td.textContent = String(text ?? '-');
  if (className) td.className = className;
  return td;
}

function renderTrend(rows) {
  const root = document.querySelector('[data-attribution-trend]');
  const empty = document.querySelector('[data-attribution-trend-empty]');
  if (!root) return;
  const grouped = groupBy(rows, (row) => row.dayKey || '-').sort((a, b) => a.key.localeCompare(b.key));
  root.replaceChildren();
  const max = Math.max(1, ...grouped.map((item) => item.count));
  grouped.slice(-31).forEach((item) => {
    const row = document.createElement('div');
    row.className = 'admin-attribution-bar';
    const label = document.createElement('small');
    label.textContent = item.key.slice(5).replace('-', '.');
    const track = document.createElement('div');
    track.className = 'admin-attribution-track';
    const fill = document.createElement('div');
    fill.className = 'admin-attribution-fill';
    fill.style.width = `${Math.max(2, (item.count / max) * 100)}%`;
    track.append(fill);
    const value = document.createElement('div');
    value.className = 'admin-attribution-value';
    value.textContent = new Intl.NumberFormat('ko-KR').format(item.count);
    row.append(label, track, value);
    root.append(row);
  });
  if (empty) empty.hidden = grouped.length > 0;
}

function renderSource(rows, total) {
  const body = document.querySelector('[data-attribution-source-table]');
  const empty = document.querySelector('[data-attribution-source-empty]');
  if (!body) return;
  const grouped = groupBy(rows, (row) => `${row.channel || 'Other'}|${row.source || '-'}|${row.medium || '-'}`);
  body.replaceChildren();
  grouped.slice(0, 30).forEach((item) => {
    const [channel, source, medium] = item.key.split('|');
    const tr = document.createElement('tr');
    tr.append(
      makeCell(channel),
      makeCell(source, 'admin-title-cell'),
      makeCell(medium, 'admin-muted'),
      makeCell(item.count),
      makeCell(total ? `${((item.count / total) * 100).toFixed(1)}%` : '0%')
    );
    body.append(tr);
  });
  if (empty) empty.hidden = grouped.length > 0;
}

function renderLanding(rows, total) {
  const body = document.querySelector('[data-attribution-landing-table]');
  const empty = document.querySelector('[data-attribution-landing-empty]');
  if (!body) return;
  const grouped = groupBy(rows, (row) => row.landingPath || '/');
  body.replaceChildren();
  grouped.slice(0, 30).forEach((item) => {
    const tr = document.createElement('tr');
    tr.append(makeCell(item.key, 'admin-title-cell'), makeCell(item.count), makeCell(total ? `${((item.count / total) * 100).toFixed(1)}%` : '0%'));
    body.append(tr);
  });
  if (empty) empty.hidden = grouped.length > 0;
}

function renderCampaign(rows) {
  const body = document.querySelector('[data-attribution-campaign-table]');
  const empty = document.querySelector('[data-attribution-campaign-empty]');
  if (!body) return;
  const campaignRows = rows.filter((row) => String(row.campaign || '').trim());
  const grouped = groupBy(campaignRows, (row) => `${row.campaign}|${row.source || '-'}|${row.medium || '-'}`);
  body.replaceChildren();
  grouped.slice(0, 30).forEach((item) => {
    const [campaign, source, medium] = item.key.split('|');
    const tr = document.createElement('tr');
    tr.append(makeCell(campaign, 'admin-title-cell'), makeCell(source), makeCell(medium, 'admin-muted'), makeCell(item.count));
    body.append(tr);
  });
  if (empty) empty.hidden = grouped.length > 0;
}

function renderDevice(rows) {
  const body = document.querySelector('[data-attribution-device-table]');
  const empty = document.querySelector('[data-attribution-device-empty]');
  if (!body) return;
  const grouped = groupBy(rows, (row) => `${row.device || '-'}|${row.browser || '-'}`);
  body.replaceChildren();
  grouped.slice(0, 20).forEach((item) => {
    const [device, browser] = item.key.split('|');
    const tr = document.createElement('tr');
    tr.append(makeCell(device), makeCell(browser), makeCell(item.count));
    body.append(tr);
  });
  if (empty) empty.hidden = grouped.length > 0;
}

function render() {
  const rows = filteredRows();
  const total = sum(rows);
  setCount('[data-attribution-total]', total);
  setCount('[data-attribution-organic]', sum(rows.filter((row) => row.channel === 'Organic Search')));
  setCount('[data-attribution-social]', sum(rows.filter((row) => row.channel === 'Social')));
  setCount('[data-attribution-direct]', sum(rows.filter((row) => row.channel === 'Direct')));
  renderTrend(rows);
  renderSource(rows, total);
  renderLanding(rows, total);
  renderCampaign(rows);
  renderDevice(rows);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const rows = filteredRows().sort((a, b) => String(a.dayKey).localeCompare(String(b.dayKey)));
  const headers = ['date','channel','source','medium','campaign','referrer_host','landing_page','device','browser','sessions'];
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push([
      row.dayKey,
      row.channel,
      row.source,
      row.medium,
      row.campaign,
      row.referrerHost,
      row.landingPath,
      row.device,
      row.browser,
      Math.max(0, Number(row.count) || 0)
    ].map(csvEscape).join(','));
  });
  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relim-attribution-${getDateKey(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function start() {
  ensureUI();
  onSnapshot(collection(db, 'trafficAttribution'), (snapshot) => {
    state.rows = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
    render();
  }, (error) => {
    console.error('[RE:LIM ATTRIBUTION ADMIN]', error);
    ensureUI();
    const empty = document.querySelector('[data-attribution-source-empty]');
    if (empty) {
      empty.hidden = false;
      empty.textContent = '유입경로 데이터를 불러오지 못했습니다. Firestore 규칙 적용 상태를 확인해 주세요.';
    }
  });
}

if (auth && db) {
  onAuthStateChanged(auth, (user) => {
    const email = String(user?.email || '').toLowerCase();
    if (user && ADMIN_EMAILS.has(email)) start();
  });
}
