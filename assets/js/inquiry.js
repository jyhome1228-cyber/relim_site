import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const ADMIN_EMAILS = new Set(['planus253@naver.com']);

const root = document.querySelector('[data-inquiry-page]');
if (!root || !auth || !db) {
  console.error('[RE:LIM Q&A] Firebase 초기화에 실패했습니다.');
}

const list = root?.querySelector('[data-inquiry-list]');
const empty = root?.querySelector('[data-inquiry-empty]');
const count = root?.querySelector('[data-inquiry-count]');
const writeButtons = root ? [...root.querySelectorAll('[data-inquiry-write]')] : [];
const writeModal = document.getElementById('inquiryWriteModal');
const detailModal = document.getElementById('inquiryDetailModal');
const editModal = document.getElementById('inquiryEditModal');
const writeForm = root?.querySelector('[data-inquiry-form]');
const writeStatus = root?.querySelector('[data-inquiry-status]');
const answerForm = detailModal?.querySelector('[data-inquiry-answer-form]');
const answerStatus = detailModal?.querySelector('[data-inquiry-answer-status]');
const editForm = editModal?.querySelector('[data-inquiry-edit-form]');
const editStatus = editModal?.querySelector('[data-inquiry-edit-status]');

let currentUser = null;
let inquiryCache = new Map();
let activeInquiryId = null;
let openedFromUrl = false;

const formatDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return '방금 전';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const maskName = (value) => {
  const name = String(value || '리림 회원').trim();
  if (name.length <= 1) return `${name}*`;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(Math.min(2, name.length - 1))}`;
};

const isAdmin = (user) => ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());

const setStatus = (element, message = '', isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
  element.hidden = !message;
};

const currentFileName = () => `${window.location.pathname.split('/').pop() || 'inquiry.html'}${window.location.search || ''}`;
const goLogin = () => {
  window.location.href = `login.html?return=${encodeURIComponent(currentFileName())}`;
};

const openModal = (modal) => {
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
};

const closeModal = (modal) => {
  if (!modal) return;
  modal.classList.remove('is-open');
  if (!document.querySelector('.community-modal.is-open')) document.body.style.overflow = '';
};

const stateLabel = (item) => item?.answer || item?.status === '답변완료' ? '답변완료' : '답변대기';

const firebaseWriteError = (error) => {
  const code = String(error?.code || '');
  if (code.includes('permission-denied')) {
    return '저장 권한이 막혀 있습니다. Firebase Firestore 규칙을 최신 상태로 게시해 주세요.';
  }
  if (code.includes('unauthenticated')) return '로그인 상태가 만료되었습니다. 다시 로그인해 주세요.';
  if (code.includes('unavailable')) return 'Firebase 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
  return '문의 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
};

function renderDetail(id, syncUrl = true) {
  const item = inquiryCache.get(id);
  if (!item || !detailModal) return;
  activeInquiryId = id;

  detailModal.querySelector('[data-inquiry-detail-category]').textContent = item.category || '문의';
  detailModal.querySelector('[data-inquiry-detail-title]').textContent = item.title || '문의';
  detailModal.querySelector('[data-inquiry-detail-meta]').textContent = `${maskName(item.userName)} · ${formatDate(item.createdAt)}`;
  detailModal.querySelector('[data-inquiry-detail-content]').textContent = item.content || '';

  const state = detailModal.querySelector('[data-inquiry-detail-state]');
  const completed = stateLabel(item) === '답변완료';
  if (state) {
    state.textContent = completed ? '답변완료' : '답변대기';
    state.classList.toggle('is-complete', completed);
  }

  const answerView = detailModal.querySelector('[data-inquiry-answer-view]');
  const answerText = detailModal.querySelector('[data-inquiry-answer-text]');
  const answerDate = detailModal.querySelector('[data-inquiry-answer-date]');
  if (answerView) answerView.hidden = !item.answer;
  if (answerText) answerText.textContent = item.answer || '';
  if (answerDate) answerDate.textContent = item.answer ? `답변일 ${formatDate(item.answeredAt)}` : '';

  const ownerActions = detailModal.querySelector('[data-inquiry-owner-actions]');
  if (ownerActions) ownerActions.hidden = !(currentUser && item.userId === currentUser.uid);

  const adminReply = detailModal.querySelector('[data-inquiry-admin-reply]');
  if (adminReply) adminReply.hidden = !isAdmin(currentUser);
  const answerInput = answerForm?.querySelector('[name="answer"]');
  if (answerInput) answerInput.value = item.answer || '';
  setStatus(answerStatus);

  if (syncUrl) history.replaceState(null, '', `inquiry.html?id=${encodeURIComponent(id)}`);
  openModal(detailModal);
}

function renderBoard(snapshot) {
  inquiryCache = new Map();
  list?.replaceChildren();
  const total = snapshot.size;

  snapshot.docs.forEach((snapshotDoc, index) => {
    const item = { id: snapshotDoc.id, ...snapshotDoc.data() };
    inquiryCache.set(item.id, item);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'inquiry-board-row';

    const no = document.createElement('span');
    no.className = 'board-no';
    no.textContent = String(total - index).padStart(2, '0');

    const category = document.createElement('span');
    category.className = 'board-category';
    category.textContent = item.category || '문의';

    const title = document.createElement('span');
    title.className = 'board-title';
    title.textContent = item.title || '문의';

    const author = document.createElement('span');
    author.className = 'board-author';
    author.textContent = maskName(item.userName);

    const date = document.createElement('span');
    date.className = 'board-date';
    date.textContent = formatDate(item.createdAt);

    const statusWrap = document.createElement('span');
    statusWrap.className = 'board-status';
    const state = document.createElement('span');
    const completed = stateLabel(item) === '답변완료';
    state.className = `inquiry-state${completed ? ' is-complete' : ''}`;
    state.textContent = completed ? '답변완료' : '답변대기';
    statusWrap.append(state);

    row.append(no, category, title, author, date, statusWrap);
    row.addEventListener('click', () => renderDetail(item.id));
    list?.append(row);
  });

  if (count) count.textContent = String(total);
  if (empty) empty.hidden = total > 0;

  const requestedId = new URLSearchParams(location.search).get('id');
  if (!openedFromUrl && requestedId && inquiryCache.has(requestedId)) {
    openedFromUrl = true;
    renderDetail(requestedId, false);
  }
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (activeInquiryId && detailModal?.classList.contains('is-open')) renderDetail(activeInquiryId, false);
  });
}

writeButtons.forEach((button) => button.addEventListener('click', () => {
  if (!currentUser) return goLogin();
  writeForm?.reset();
  setStatus(writeStatus);
  openModal(writeModal);
}));

if (db) {
  onSnapshot(
    query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')),
    renderBoard,
    (error) => {
      console.error('[RE:LIM Q&A] 목록 불러오기 실패:', error);
      if (empty) {
        empty.hidden = false;
        empty.textContent = '문의 게시판을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      }
    }
  );
}

writeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return goLogin();

  const submit = writeForm.querySelector('[type="submit"]');
  const data = new FormData(writeForm);
  const category = String(data.get('category') || '이용 문의').trim();
  const title = String(data.get('title') || '').trim();
  const content = String(data.get('content') || '').trim();

  if (title.length < 2 || content.length < 5) {
    return setStatus(writeStatus, '문의 제목과 내용을 조금 더 입력해 주세요.', true);
  }

  submit.disabled = true;
  setStatus(writeStatus, '문의 글을 저장하고 있습니다.');

  try {
    const newInquiry = await addDoc(collection(db, 'inquiries'), {
      userId: currentUser.uid,
      userName: maskName(currentUser.displayName || '리림 회원'),
      category,
      title,
      content,
      status: '답변대기',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    writeForm.reset();
    setStatus(writeStatus, '문의가 등록되었습니다. 게시글로 이동합니다.');

    window.setTimeout(() => {
      window.location.href = `inquiry.html?id=${encodeURIComponent(newInquiry.id)}`;
    }, 350);
  } catch (error) {
    console.error('[RE:LIM Q&A] 문의 저장 실패:', error);
    setStatus(writeStatus, firebaseWriteError(error), true);
  } finally {
    submit.disabled = false;
  }
});

detailModal?.querySelector('[data-inquiry-edit]')?.addEventListener('click', () => {
  const item = inquiryCache.get(activeInquiryId);
  if (!item || !currentUser || item.userId !== currentUser.uid || !editForm) return;

  editForm.elements.category.value = item.category || '이용 문의';
  editForm.elements.title.value = item.title || '';
  editForm.elements.content.value = item.content || '';
  setStatus(editStatus);
  closeModal(detailModal);
  openModal(editModal);
});

editForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const item = inquiryCache.get(activeInquiryId);
  if (!item || !currentUser || item.userId !== currentUser.uid) return;

  const submit = editForm.querySelector('[type="submit"]');
  const data = new FormData(editForm);
  const category = String(data.get('category') || '이용 문의').trim();
  const title = String(data.get('title') || '').trim();
  const content = String(data.get('content') || '').trim();

  if (title.length < 2 || content.length < 5) {
    return setStatus(editStatus, '문의 제목과 내용을 조금 더 입력해 주세요.', true);
  }

  submit.disabled = true;
  setStatus(editStatus, '문의를 수정하고 있습니다.');
  try {
    await updateDoc(doc(db, 'inquiries', activeInquiryId), {
      category,
      title,
      content,
      updatedAt: serverTimestamp()
    });
    setStatus(editStatus, '문의가 수정되었습니다.');
    window.setTimeout(() => {
      closeModal(editModal);
      window.location.href = `inquiry.html?id=${encodeURIComponent(activeInquiryId)}`;
    }, 300);
  } catch (error) {
    console.error('[RE:LIM Q&A] 문의 수정 실패:', error);
    setStatus(editStatus, firebaseWriteError(error), true);
  } finally {
    submit.disabled = false;
  }
});

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser || !isAdmin(currentUser) || !activeInquiryId) return;

  const submit = answerForm.querySelector('[type="submit"]');
  const answer = String(new FormData(answerForm).get('answer') || '').trim();
  if (answer.length < 2) return setStatus(answerStatus, '답변 내용을 입력해 주세요.', true);

  submit.disabled = true;
  setStatus(answerStatus, '답변을 등록하고 있습니다.');
  try {
    await updateDoc(doc(db, 'inquiries', activeInquiryId), {
      answer,
      status: '답변완료',
      answeredAt: serverTimestamp(),
      answeredBy: currentUser.email || 'RE:LIM',
      updatedAt: serverTimestamp()
    });
    setStatus(answerStatus, '관리자 답변이 등록되었습니다.');
  } catch (error) {
    console.error('[RE:LIM Q&A] 관리자 답변 실패:', error);
    setStatus(answerStatus, firebaseWriteError(error), true);
  } finally {
    submit.disabled = false;
  }
});

document.querySelectorAll('[data-community-close]').forEach((button) => {
  button.addEventListener('click', () => closeModal(button.closest('.community-modal')));
});

document.querySelectorAll('.community-modal').forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.community-modal.is-open').forEach(closeModal);
  if (new URLSearchParams(location.search).has('id')) history.replaceState(null, '', 'inquiry.html');
});
