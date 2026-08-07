import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const ADMIN_EMAILS = new Set(['planus253@naver.com']);

const root = document.querySelector('[data-inquiry-page]');
const list = root?.querySelector('[data-inquiry-list]');
const empty = root?.querySelector('[data-inquiry-empty]');
const count = root?.querySelector('[data-inquiry-count]');
const boardLabel = root?.querySelector('[data-inquiry-board-label]');
const writeButtons = root ? [...root.querySelectorAll('[data-inquiry-write]')] : [];
const writeModal = document.getElementById('inquiryWriteModal');
const detailModal = document.getElementById('inquiryDetailModal');
const editModal = document.getElementById('inquiryEditModal');
const privacyModal = document.getElementById('inquiryPrivacyModal');
const writeForm = root?.querySelector('[data-inquiry-form]');
const writeStatus = root?.querySelector('[data-inquiry-status]');
const answerForm = detailModal?.querySelector('[data-inquiry-answer-form]');
const answerStatus = detailModal?.querySelector('[data-inquiry-answer-status]');
const editForm = editModal?.querySelector('[data-inquiry-edit-form]');
const editStatus = editModal?.querySelector('[data-inquiry-edit-status]');
const ownerActions = detailModal?.querySelector('[data-inquiry-owner-actions]');
const editButton = detailModal?.querySelector('[data-inquiry-edit]');
const deleteButton = detailModal?.querySelector('[data-inquiry-delete]');
const deleteStatus = detailModal?.querySelector('[data-inquiry-delete-status]');

let currentUser = null;
let indexCache = new Map();
let activeInquiryId = null;
let activeInquiry = null;
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

const firebaseErrorMessage = (error, action = '저장') => {
  const code = String(error?.code || '');
  if (code.includes('permission-denied')) return `${action} 권한이 없습니다. Firebase Firestore 규칙을 최신 상태로 게시해 주세요.`;
  if (code.includes('unauthenticated')) return '로그인 상태가 만료되었습니다. 다시 로그인해 주세요.';
  if (code.includes('failed-precondition')) return 'Firestore 설정을 확인해 주세요.';
  if (code.includes('unavailable')) return 'Firebase 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
  return `${action} 중 오류가 발생했습니다. (${code || 'unknown'})`;
};

function showPrivateNotice(needsLogin = false) {
  const message = privacyModal?.querySelector('[data-private-message]');
  if (message) {
    message.textContent = needsLogin
      ? '문의 내용은 작성자 본인만 확인할 수 있습니다. 로그인 후 본인이 작성한 글이라면 내용을 확인할 수 있습니다.'
      : '문의 내용은 작성자 본인만 확인할 수 있습니다. 다른 회원의 문의 내용과 관리자 답변은 공개되지 않습니다.';
  }
  openModal(privacyModal);
}

function renderDetail(id, item, syncUrl = true) {
  if (!detailModal || !item) return;

  activeInquiryId = id;
  activeInquiry = item;

  detailModal.querySelector('[data-inquiry-detail-category]').textContent = item.category || '문의';
  detailModal.querySelector('[data-inquiry-detail-title]').textContent = item.title || '문의';
  detailModal.querySelector('[data-inquiry-detail-meta]').textContent = `${maskName(item.userName)} · ${formatDate(item.createdAt)}`;
  detailModal.querySelector('[data-inquiry-detail-content]').textContent = item.content || '';

  const completed = Boolean(item.answer) || item.status === '답변완료';
  const state = detailModal.querySelector('[data-inquiry-detail-state]');
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

  const owner = Boolean(currentUser && item.userId === currentUser.uid);
  const admin = isAdmin(currentUser);
  if (ownerActions) ownerActions.hidden = !(owner || admin);
  if (editButton) editButton.hidden = !owner;
  if (deleteButton) deleteButton.hidden = !(owner || admin);

  const adminReply = detailModal.querySelector('[data-inquiry-admin-reply]');
  if (adminReply) adminReply.hidden = !admin;
  const answerInput = answerForm?.querySelector('[name="answer"]');
  if (answerInput) answerInput.value = item.answer || '';
  setStatus(answerStatus);
  setStatus(deleteStatus);

  if (syncUrl) history.replaceState(null, '', `inquiry.html?id=${encodeURIComponent(id)}`);
  openModal(detailModal);
}

async function openInquiry(indexItem, syncUrl = true) {
  if (!indexItem) return;

  if (!currentUser) {
    showPrivateNotice(true);
    return;
  }

  const owner = indexItem.ownerUid === currentUser.uid;
  const admin = isAdmin(currentUser);
  if (!owner && !admin) {
    showPrivateNotice(false);
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, 'inquiries', indexItem.id));
    if (!snapshot.exists()) {
      window.alert('문의 내용을 찾을 수 없습니다.');
      return;
    }
    renderDetail(indexItem.id, { id: snapshot.id, ...snapshot.data() }, syncUrl);
  } catch (error) {
    console.error('[RE:LIM Q&A] 문의 상세 조회 실패:', error);
    if (String(error?.code || '').includes('permission-denied')) {
      showPrivateNotice(false);
      return;
    }
    window.alert(firebaseErrorMessage(error, '조회'));
  }
}

function renderBoard(snapshot) {
  indexCache = new Map();
  list?.replaceChildren();

  const docs = [...snapshot.docs].sort((a, b) => {
    const aTime = a.data().createdAt?.toMillis?.() || 0;
    const bTime = b.data().createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
  const total = docs.length;

  docs.forEach((snapshotDoc, index) => {
    const item = { id: snapshotDoc.id, ...snapshotDoc.data() };
    indexCache.set(item.id, item);

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
    author.textContent = item.userName || '리림 회원';

    const date = document.createElement('span');
    date.className = 'board-date';
    date.textContent = formatDate(item.createdAt);

    const statusWrap = document.createElement('span');
    statusWrap.className = 'board-status';
    const state = document.createElement('span');
    const completed = item.status === '답변완료';
    state.className = `inquiry-state${completed ? ' is-complete' : ''}`;
    state.textContent = completed ? '답변완료' : '답변대기';
    statusWrap.append(state);

    row.append(no, category, title, author, date, statusWrap);
    row.addEventListener('click', () => openInquiry(item));
    list?.append(row);
  });

  if (count) count.textContent = String(total);
  if (boardLabel) boardLabel.textContent = 'Q&A';
  if (empty) {
    empty.hidden = total > 0;
    empty.textContent = '아직 등록된 문의가 없습니다.';
  }

  const requestedId = new URLSearchParams(location.search).get('id');
  if (!openedFromUrl && requestedId && indexCache.has(requestedId)) {
    openedFromUrl = true;
    openInquiry(indexCache.get(requestedId), false);
  }
}

if (db) {
  onSnapshot(
    query(collection(db, 'inquiryIndex'), orderBy('createdAt', 'desc')),
    renderBoard,
    (error) => {
      console.error('[RE:LIM Q&A] 문의 목록 불러오기 실패:', error);
      if (empty) {
        empty.hidden = false;
        empty.textContent = firebaseErrorMessage(error, '조회');
      }
    }
  );
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    openedFromUrl = false;
    if (!user && detailModal?.classList.contains('is-open')) closeModal(detailModal);
  });
}

writeButtons.forEach((button) => button.addEventListener('click', () => {
  if (!currentUser) return goLogin();
  writeForm?.reset();
  setStatus(writeStatus);
  openModal(writeModal);
}));

writeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return goLogin();
  if (!db) return setStatus(writeStatus, 'Firestore가 초기화되지 않았습니다.', true);

  const submit = writeForm.querySelector('[type="submit"]');
  const data = new FormData(writeForm);
  const category = String(data.get('category') || '이용 문의').trim();
  const title = String(data.get('title') || '').trim();
  const content = String(data.get('content') || '').trim();

  if (title.length < 2 || content.length < 5) {
    return setStatus(writeStatus, '문의 제목과 내용을 조금 더 입력해 주세요.', true);
  }

  submit.disabled = true;
  setStatus(writeStatus, '문의를 등록하고 있습니다.');

  try {
    const inquiryRef = doc(collection(db, 'inquiries'));
    const indexRef = doc(db, 'inquiryIndex', inquiryRef.id);
    const now = Timestamp.now();
    const maskedName = maskName(currentUser.displayName || '리림 회원');

    const privatePayload = {
      userId: currentUser.uid,
      userName: maskedName,
      category,
      title,
      content,
      status: '답변대기',
      createdAt: now,
      updatedAt: now
    };

    const publicPayload = {
      ownerUid: currentUser.uid,
      userName: maskedName,
      category,
      title,
      status: '답변대기',
      createdAt: now,
      updatedAt: now
    };

    const batch = writeBatch(db);
    batch.set(inquiryRef, privatePayload);
    batch.set(indexRef, publicPayload);
    await batch.commit();

    writeForm.reset();
    setStatus(writeStatus, '문의가 등록되었습니다.');

    window.setTimeout(() => {
      closeModal(writeModal);
      window.location.href = `inquiry.html?id=${encodeURIComponent(inquiryRef.id)}`;
    }, 250);
  } catch (error) {
    console.error('[RE:LIM Q&A] 문의 등록 실패:', error);
    setStatus(writeStatus, firebaseErrorMessage(error, '등록'), true);
  } finally {
    submit.disabled = false;
  }
});

editButton?.addEventListener('click', () => {
  if (!activeInquiry || !currentUser || activeInquiry.userId !== currentUser.uid || !editForm) return;
  editForm.elements.category.value = activeInquiry.category || '이용 문의';
  editForm.elements.title.value = activeInquiry.title || '';
  editForm.elements.content.value = activeInquiry.content || '';
  setStatus(editStatus);
  closeModal(detailModal);
  openModal(editModal);
});

editForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeInquiryId || !activeInquiry || !currentUser || activeInquiry.userId !== currentUser.uid) return;

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
    const now = Timestamp.now();
    const batch = writeBatch(db);
    batch.update(doc(db, 'inquiries', activeInquiryId), { category, title, content, updatedAt: now });
    batch.update(doc(db, 'inquiryIndex', activeInquiryId), { category, title, updatedAt: now });
    await batch.commit();

    setStatus(editStatus, '문의가 수정되었습니다.');
    window.setTimeout(() => {
      closeModal(editModal);
      window.location.href = `inquiry.html?id=${encodeURIComponent(activeInquiryId)}`;
    }, 250);
  } catch (error) {
    console.error('[RE:LIM Q&A] 문의 수정 실패:', error);
    setStatus(editStatus, firebaseErrorMessage(error, '수정'), true);
  } finally {
    submit.disabled = false;
  }
});

deleteButton?.addEventListener('click', async () => {
  if (!activeInquiryId || !activeInquiry || !currentUser) return;
  const owner = activeInquiry.userId === currentUser.uid;
  const admin = isAdmin(currentUser);
  if (!owner && !admin) return;
  if (!window.confirm('이 문의를 삭제할까요? 삭제한 글은 복구할 수 없습니다.')) return;

  deleteButton.disabled = true;
  setStatus(deleteStatus, '문의를 삭제하고 있습니다.');

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'inquiries', activeInquiryId));
    batch.delete(doc(db, 'inquiryIndex', activeInquiryId));
    await batch.commit();

    activeInquiryId = null;
    activeInquiry = null;
    closeModal(detailModal);
    history.replaceState(null, '', 'inquiry.html');
  } catch (error) {
    console.error('[RE:LIM Q&A] 문의 삭제 실패:', error);
    setStatus(deleteStatus, firebaseErrorMessage(error, '삭제'), true);
  } finally {
    deleteButton.disabled = false;
  }
});

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeInquiryId || !activeInquiry || !currentUser || !isAdmin(currentUser)) return;

  const submit = answerForm.querySelector('[type="submit"]');
  const answer = String(new FormData(answerForm).get('answer') || '').trim();
  if (answer.length < 2) return setStatus(answerStatus, '답변 내용을 입력해 주세요.', true);

  submit.disabled = true;
  setStatus(answerStatus, '답변을 등록하고 있습니다.');

  try {
    const now = Timestamp.now();
    const batch = writeBatch(db);
    batch.update(doc(db, 'inquiries', activeInquiryId), {
      answer,
      status: '답변완료',
      answeredAt: now,
      answeredBy: currentUser.email || 'RE:LIM',
      updatedAt: now
    });
    batch.update(doc(db, 'inquiryIndex', activeInquiryId), {
      status: '답변완료',
      updatedAt: now
    });
    await batch.commit();

    activeInquiry = {
      ...activeInquiry,
      answer,
      status: '답변완료',
      answeredAt: now,
      answeredBy: currentUser.email || 'RE:LIM',
      updatedAt: now
    };
    renderDetail(activeInquiryId, activeInquiry, false);
    setStatus(answerStatus, '관리자 답변이 등록되었습니다.');
  } catch (error) {
    console.error('[RE:LIM Q&A] 관리자 답변 실패:', error);
    setStatus(answerStatus, firebaseErrorMessage(error, '답변 등록'), true);
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
