import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com']);
const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const loading = document.querySelector('[data-admin-loading]');
const denied = document.querySelector('[data-admin-denied]');
const dashboard = document.querySelector('[data-admin-dashboard]');
const session = document.querySelector('[data-admin-session]');
const logoutButton = document.querySelector('[data-admin-logout]');

const memberTable = document.querySelector('[data-member-table]');
const inquiryTable = document.querySelector('[data-inquiry-table]');
const reviewTable = document.querySelector('[data-review-table]');
const memberEmpty = document.querySelector('[data-member-empty]');
const inquiryEmpty = document.querySelector('[data-inquiry-empty]');
const reviewEmpty = document.querySelector('[data-review-empty]');

const statMembers = document.querySelector('[data-stat-members]');
const statInquiries = document.querySelector('[data-stat-inquiries]');
const statWaiting = document.querySelector('[data-stat-waiting]');
const statReviews = document.querySelector('[data-stat-reviews]');
const memberCount = document.querySelector('[data-member-count]');
const inquiryCount = document.querySelector('[data-inquiry-count]');
const reviewCount = document.querySelector('[data-review-count]');

const inquiryModal = document.getElementById('adminInquiryModal');
const inquiryCategory = inquiryModal?.querySelector('[data-admin-inquiry-category]');
const inquiryTitle = inquiryModal?.querySelector('[data-admin-inquiry-title]');
const inquiryMeta = inquiryModal?.querySelector('[data-admin-inquiry-meta]');
const inquiryContent = inquiryModal?.querySelector('[data-admin-inquiry-content]');
const answerView = inquiryModal?.querySelector('[data-admin-answer-view]');
const answerText = inquiryModal?.querySelector('[data-admin-answer-text]');
const answerForm = inquiryModal?.querySelector('[data-admin-answer-form]');
const answerStatus = inquiryModal?.querySelector('[data-admin-answer-status]');
const openInquiryLink = inquiryModal?.querySelector('[data-admin-open-inquiry]');

let activeInquiryId = null;
let activeInquiry = null;
let unsubscribers = [];

const isAdmin = (user) => ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value, withTime = false) => {
  const date = toDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' }
  ).format(date);
};

const sortByDate = (docs, field = 'createdAt') => [...docs].sort((a, b) => {
  const aDate = toDate(a.data()?.[field]);
  const bDate = toDate(b.data()?.[field]);
  return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
});

const providerLabel = (provider) => {
  if (provider === 'google.com') return 'Google';
  if (provider === 'password') return '이메일';
  return provider || '-';
};

const maskName = (value) => {
  const name = String(value || '리림 회원').trim();
  if (name.length <= 1) return `${name}*`;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(Math.min(2, name.length - 1))}`;
};

const makeCell = (text = '', className = '') => {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
};

const setStatus = (element, message = '', isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
  element.hidden = !message;
};

const openModal = (modal) => {
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
};

const closeModal = (modal) => {
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
};

function renderMembers(snapshot) {
  const docs = sortByDate(snapshot.docs, 'lastLoginAt');
  memberTable?.replaceChildren();

  docs.forEach((snapshotDoc) => {
    const item = snapshotDoc.data();
    const tr = document.createElement('tr');
    tr.append(
      makeCell(item.name || '리림 회원'),
      makeCell(item.email || '-', 'admin-muted'),
      makeCell(providerLabel(item.provider)),
      makeCell(formatDate(item.createdAt), 'admin-muted'),
      makeCell(formatDate(item.lastLoginAt, true), 'admin-muted')
    );
    memberTable?.append(tr);
  });

  if (statMembers) statMembers.textContent = String(docs.length);
  if (memberCount) memberCount.textContent = `${docs.length}명`;
  if (memberEmpty) memberEmpty.hidden = docs.length > 0;
}

function renderInquiries(snapshot) {
  const docs = sortByDate(snapshot.docs);
  inquiryTable?.replaceChildren();
  let waiting = 0;

  docs.forEach((snapshotDoc) => {
    const item = { id: snapshotDoc.id, ...snapshotDoc.data() };
    const completed = Boolean(item.answer) || item.status === '답변완료';
    if (!completed) waiting += 1;

    const tr = document.createElement('tr');
    const statusTd = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `admin-badge${completed ? ' done' : ''}`;
    badge.textContent = completed ? '답변완료' : '답변대기';
    statusTd.append(badge);

    const actionTd = document.createElement('td');
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'admin-row-button';
    action.textContent = '내용 보기';
    action.addEventListener('click', () => openInquiry(item));
    actionTd.append(action);

    tr.append(
      statusTd,
      makeCell(item.category || '문의', 'admin-muted'),
      makeCell(item.title || '문의', 'admin-title-cell'),
      makeCell(maskName(item.userName), 'admin-muted'),
      makeCell(formatDate(item.createdAt), 'admin-muted'),
      actionTd
    );
    inquiryTable?.append(tr);
  });

  if (statInquiries) statInquiries.textContent = String(docs.length);
  if (statWaiting) statWaiting.textContent = String(waiting);
  if (inquiryCount) inquiryCount.textContent = `${docs.length}건`;
  if (inquiryEmpty) inquiryEmpty.hidden = docs.length > 0;

  if (activeInquiryId) {
    const updated = docs.find((docSnap) => docSnap.id === activeInquiryId);
    if (updated && inquiryModal?.classList.contains('is-open')) {
      openInquiry({ id: updated.id, ...updated.data() }, false);
    }
  }
}

function renderReviews(snapshot) {
  const docs = sortByDate(snapshot.docs);
  reviewTable?.replaceChildren();

  docs.forEach((snapshotDoc) => {
    const item = snapshotDoc.data();
    const tr = document.createElement('tr');

    const imageTd = document.createElement('td');
    if (item.imageDataUrl) {
      const img = document.createElement('img');
      img.className = 'admin-thumb';
      img.src = item.imageDataUrl;
      img.alt = item.title || '리뷰 이미지';
      imageTd.append(img);
    } else {
      imageTd.textContent = '-';
      imageTd.className = 'admin-muted';
    }

    const ratingTd = document.createElement('td');
    ratingTd.className = 'admin-stars';
    const rating = Math.max(0, Math.min(5, Number(item.rating) || 0));
    ratingTd.textContent = rating ? `${'★'.repeat(rating)} ${rating.toFixed(1)}` : '-';

    tr.append(
      imageTd,
      ratingTd,
      makeCell(item.title || '리뷰', 'admin-title-cell'),
      makeCell(item.userName || '리림 회원', 'admin-muted'),
      makeCell(formatDate(item.createdAt), 'admin-muted')
    );
    reviewTable?.append(tr);
  });

  if (statReviews) statReviews.textContent = String(docs.length);
  if (reviewCount) reviewCount.textContent = `${docs.length}건`;
  if (reviewEmpty) reviewEmpty.hidden = docs.length > 0;
}

function openInquiry(item, shouldOpen = true) {
  if (!item || !inquiryModal) return;
  activeInquiryId = item.id;
  activeInquiry = item;

  if (inquiryCategory) inquiryCategory.textContent = item.category || '문의';
  if (inquiryTitle) inquiryTitle.textContent = item.title || '문의';
  if (inquiryMeta) inquiryMeta.textContent = `${maskName(item.userName)} · ${formatDate(item.createdAt, true)} · ${item.status || '답변대기'}`;
  if (inquiryContent) inquiryContent.textContent = item.content || '';
  if (answerView) answerView.hidden = !item.answer;
  if (answerText) answerText.textContent = item.answer || '';
  if (answerForm?.elements.answer) answerForm.elements.answer.value = item.answer || '';
  if (openInquiryLink) openInquiryLink.href = `inquiry.html?id=${encodeURIComponent(item.id)}`;
  setStatus(answerStatus);

  if (shouldOpen) openModal(inquiryModal);
}

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeInquiryId || !activeInquiry || !db) return;
  const submit = answerForm.querySelector('[type="submit"]');
  const answer = String(new FormData(answerForm).get('answer') || '').trim();
  if (answer.length < 2) return setStatus(answerStatus, '답변 내용을 입력해 주세요.', true);

  submit.disabled = true;
  setStatus(answerStatus, '답변을 저장하고 있습니다.');
  try {
    const now = Timestamp.now();
    const batch = writeBatch(db);
    batch.update(doc(db, 'inquiries', activeInquiryId), {
      answer,
      status: '답변완료',
      answeredAt: now,
      answeredBy: auth.currentUser?.email || 'RE:LIM',
      updatedAt: now
    });
    batch.update(doc(db, 'inquiryIndex', activeInquiryId), {
      status: '답변완료',
      updatedAt: now
    });
    await batch.commit();
    setStatus(answerStatus, '관리자 답변이 저장되었습니다.');
  } catch (error) {
    console.error('[RE:LIM ADMIN ANSWER]', error);
    const code = String(error?.code || '');
    setStatus(answerStatus, code.includes('permission-denied')
      ? '관리자 답변 권한이 없습니다. Firestore Rules를 최신 상태로 게시해 주세요.'
      : `답변 저장 중 오류가 발생했습니다. (${code || 'unknown'})`, true);
  } finally {
    submit.disabled = false;
  }
});

function startDashboard(user) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = true;
  if (dashboard) dashboard.hidden = false;
  if (session) session.textContent = `ADMIN · ${user.email || ''}`;

  unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  unsubscribers = [
    onSnapshot(collection(db, 'users'), renderMembers, (error) => console.error('[RE:LIM ADMIN USERS]', error)),
    onSnapshot(collection(db, 'inquiries'), renderInquiries, (error) => console.error('[RE:LIM ADMIN INQUIRIES]', error)),
    onSnapshot(collection(db, 'reviews'), renderReviews, (error) => console.error('[RE:LIM ADMIN REVIEWS]', error))
  ];
}

if (!auth || !db) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = false;
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace('login.html?return=admin.html');
      return;
    }
    if (!isAdmin(user)) {
      if (loading) loading.hidden = true;
      if (dashboard) dashboard.hidden = true;
      if (denied) denied.hidden = false;
      return;
    }
    startDashboard(user);
  });
}

logoutButton?.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await signOut(auth);
    window.location.href = 'login.html?return=admin.html';
  } finally {
    logoutButton.disabled = false;
  }
});

document.querySelectorAll('[data-admin-close]').forEach((button) => {
  button.addEventListener('click', () => closeModal(button.closest('.admin-modal')));
});

inquiryModal?.addEventListener('click', (event) => {
  if (event.target === inquiryModal) closeModal(inquiryModal);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal(inquiryModal);
});
