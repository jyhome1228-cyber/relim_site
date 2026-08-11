import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  Timestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com', 'penury@naver.com']);
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

let activeQuestionId = null;
let activeQuestion = null;
let activeBody = null;
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

function renderQuestions(snapshot) {
  const docs = sortByDate(snapshot.docs);
  inquiryTable?.replaceChildren();
  let waiting = 0;

  docs.forEach((snapshotDoc) => {
    const item = { id: snapshotDoc.id, ...snapshotDoc.data() };
    const completed = item.status === '답변완료';
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
    action.addEventListener('click', () => openQuestion(item));
    actionTd.append(action);

    tr.append(
      statusTd,
      makeCell(item.category || '문의', 'admin-muted'),
      makeCell(item.title || '문의', 'admin-title-cell'),
      makeCell(item.userName || '리림 회원', 'admin-muted'),
      makeCell(formatDate(item.createdAt), 'admin-muted'),
      actionTd
    );
    inquiryTable?.append(tr);
  });

  if (statInquiries) statInquiries.textContent = String(docs.length);
  if (statWaiting) statWaiting.textContent = String(waiting);
  if (inquiryCount) inquiryCount.textContent = `${docs.length}건`;
  if (inquiryEmpty) inquiryEmpty.hidden = docs.length > 0;
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

async function openQuestion(item) {
  if (!item || !inquiryModal) return;
  try {
    const bodySnap = await getDoc(doc(db, 'questions', item.id, 'private', 'body'));
    if (!bodySnap.exists()) {
      window.alert('문의 본문이 없습니다.');
      return;
    }
    activeQuestionId = item.id;
    activeQuestion = item;
    activeBody = bodySnap.data();

    if (inquiryCategory) inquiryCategory.textContent = item.category || '문의';
    if (inquiryTitle) inquiryTitle.textContent = item.title || '문의';
    if (inquiryMeta) inquiryMeta.textContent = `${item.userName || '리림 회원'} · ${formatDate(item.createdAt, true)} · ${item.status || '답변대기'}`;
    if (inquiryContent) inquiryContent.textContent = activeBody.content || '';
    if (answerView) answerView.hidden = !activeBody.answer;
    if (answerText) answerText.textContent = activeBody.answer || '';
    if (answerForm?.elements.answer) answerForm.elements.answer.value = activeBody.answer || '';
    if (openInquiryLink) openInquiryLink.href = `inquiry.html?id=${encodeURIComponent(item.id)}`;
    setStatus(answerStatus);
    openModal(inquiryModal);
  } catch (error) {
    console.error('[RE:LIM ADMIN QUESTION]', error);
    window.alert('문의 내용을 불러오지 못했습니다.');
  }
}

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeQuestionId || !activeQuestion || !db) return;
  const submit = answerForm.querySelector('[type="submit"]');
  const answer = String(new FormData(answerForm).get('answer') || '').trim();
  if (answer.length < 2) return setStatus(answerStatus, '답변 내용을 입력해 주세요.', true);

  submit.disabled = true;
  setStatus(answerStatus, '답변을 저장하고 있습니다.');
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'questions', activeQuestionId, 'private', 'body'), {
      answer,
      answeredAt: now,
      answeredBy: auth.currentUser?.email || 'RE:LIM',
      updatedAt: now
    });
    await updateDoc(doc(db, 'questions', activeQuestionId), {
      status: '답변완료',
      updatedAt: now
    });
    setStatus(answerStatus, '관리자 답변이 저장되었습니다.');
    if (answerView) answerView.hidden = false;
    if (answerText) answerText.textContent = answer;
  } catch (error) {
    console.error('[RE:LIM ADMIN ANSWER]', error);
    setStatus(answerStatus, '답변 저장에 실패했습니다.', true);
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
    onSnapshot(collection(db, 'questions'), renderQuestions, (error) => console.error('[RE:LIM ADMIN QUESTIONS]', error)),
    onSnapshot(collection(db, 'reviews'), renderReviews, (error) => console.error('[RE:LIM ADMIN REVIEWS]', error))
  ];
}

if (!auth || !db) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = false;
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.replace('login.html?return=admin.html');
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
    location.href = 'login.html?return=admin.html';
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
