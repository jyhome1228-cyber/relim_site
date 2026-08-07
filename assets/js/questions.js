import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const ADMIN_EMAILS = new Set(['planus253@naver.com']);

const page = document.querySelector('[data-question-page]');
const list = page?.querySelector('[data-question-list]');
const empty = page?.querySelector('[data-question-empty]');
const count = page?.querySelector('[data-question-count]');
const writeButton = page?.querySelector('[data-question-write]');
const writeModal = document.getElementById('questionWriteModal');
const detailModal = document.getElementById('questionDetailModal');
const privacyModal = document.getElementById('questionPrivacyModal');
const editModal = document.getElementById('questionEditModal');
const writeForm = document.querySelector('[data-question-form]');
const writeStatus = document.querySelector('[data-question-status]');
const editForm = document.querySelector('[data-question-edit-form]');
const editStatus = document.querySelector('[data-question-edit-status]');
const answerForm = document.querySelector('[data-question-answer-form]');
const answerStatus = document.querySelector('[data-question-answer-status]');

let currentUser = null;
let activeId = null;
let activePost = null;
let postCache = new Map();

const isAdmin = (user) => ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());

const formatDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const maskName = (value) => {
  const name = String(value || '리림 회원').trim();
  if (name.length <= 1) return `${name}*`;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}**`;
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
  if (!document.querySelector('.community-modal.is-open')) document.body.style.overflow = '';
};

const goLogin = () => {
  const current = `${location.pathname.split('/').pop() || 'inquiry.html'}${location.search || ''}`;
  location.href = `login.html?return=${encodeURIComponent(current)}`;
};

function showPrivacyNotice(needsLogin = false) {
  const text = privacyModal?.querySelector('[data-question-private-message]');
  if (text) {
    text.textContent = needsLogin
      ? '문의 내용은 작성자 본인만 확인할 수 있습니다. 로그인 후 본인이 작성한 글이라면 확인할 수 있습니다.'
      : '문의 내용은 작성자 본인만 확인할 수 있습니다. 다른 회원의 문의 내용과 관리자 답변은 공개되지 않습니다.';
  }
  openModal(privacyModal);
}

function renderBoard(snapshot) {
  postCache = new Map();
  list?.replaceChildren();
  const docs = [...snapshot.docs].sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));

  docs.forEach((snap, index) => {
    const post = { id: snap.id, ...snap.data() };
    postCache.set(post.id, post);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'inquiry-board-row';

    const no = document.createElement('span');
    no.className = 'board-no';
    no.textContent = String(docs.length - index).padStart(2, '0');

    const category = document.createElement('span');
    category.className = 'board-category';
    category.textContent = post.category || '문의';

    const title = document.createElement('span');
    title.className = 'board-title';
    title.textContent = post.title || '문의';

    const author = document.createElement('span');
    author.className = 'board-author';
    author.textContent = post.userName || '리림 회원';

    const date = document.createElement('span');
    date.className = 'board-date';
    date.textContent = formatDate(post.createdAt);

    const stateWrap = document.createElement('span');
    stateWrap.className = 'board-status';
    const state = document.createElement('span');
    state.className = `inquiry-state${post.status === '답변완료' ? ' is-complete' : ''}`;
    state.textContent = post.status === '답변완료' ? '답변완료' : '답변대기';
    stateWrap.append(state);

    row.append(no, category, title, author, date, stateWrap);
    row.addEventListener('click', () => openPost(post));
    list?.append(row);
  });

  if (count) count.textContent = String(docs.length);
  if (empty) empty.hidden = docs.length > 0;

  const id = new URLSearchParams(location.search).get('id');
  if (id && postCache.has(id)) openPost(postCache.get(id), false);
}

async function openPost(post, syncUrl = true) {
  if (!post) return;
  const user = auth?.currentUser || currentUser;
  if (!user) return showPrivacyNotice(true);
  if (!isAdmin(user) && post.ownerUid !== user.uid) return showPrivacyNotice(false);

  try {
    const bodySnap = await getDoc(doc(db, 'questions', post.id, 'private', 'body'));
    if (!bodySnap.exists()) {
      window.alert('문의 내용을 찾을 수 없습니다.');
      return;
    }
    const body = bodySnap.data();
    activeId = post.id;
    activePost = { ...post, ...body };

    detailModal.querySelector('[data-question-detail-category]').textContent = post.category || '문의';
    detailModal.querySelector('[data-question-detail-title]').textContent = post.title || '문의';
    detailModal.querySelector('[data-question-detail-meta]').textContent = `${post.userName || '리림 회원'} · ${formatDate(post.createdAt)}`;
    detailModal.querySelector('[data-question-detail-content]').textContent = body.content || '';

    const state = detailModal.querySelector('[data-question-detail-state]');
    const done = post.status === '답변완료';
    state.textContent = done ? '답변완료' : '답변대기';
    state.classList.toggle('is-complete', done);

    const answerView = detailModal.querySelector('[data-question-answer-view]');
    const answerText = detailModal.querySelector('[data-question-answer-text]');
    const answerDate = detailModal.querySelector('[data-question-answer-date]');
    answerView.hidden = !body.answer;
    answerText.textContent = body.answer || '';
    answerDate.textContent = body.answer ? `답변일 ${formatDate(body.answeredAt)}` : '';

    const ownerActions = detailModal.querySelector('[data-question-owner-actions]');
    const owner = post.ownerUid === user.uid;
    const admin = isAdmin(user);
    ownerActions.hidden = !(owner || admin);
    detailModal.querySelector('[data-question-edit]').hidden = !owner;
    detailModal.querySelector('[data-question-delete]').hidden = !(owner || admin);

    const adminReply = detailModal.querySelector('[data-question-admin-reply]');
    adminReply.hidden = !admin;
    if (answerForm?.elements.answer) answerForm.elements.answer.value = body.answer || '';
    setStatus(answerStatus);

    if (syncUrl) history.replaceState(null, '', `inquiry.html?id=${encodeURIComponent(post.id)}`);
    openModal(detailModal);
  } catch (error) {
    console.error('[RE:LIM QUESTION OPEN]', error);
    if (String(error?.code || '').includes('permission-denied')) return showPrivacyNotice(false);
    window.alert('문의 내용을 불러오지 못했습니다.');
  }
}

if (db) {
  onSnapshot(
    query(collection(db, 'questions'), orderBy('createdAt', 'desc')),
    renderBoard,
    (error) => {
      console.error('[RE:LIM QUESTION LIST]', error);
      if (empty) {
        empty.hidden = false;
        empty.textContent = '문의 목록을 불러오지 못했습니다.';
      }
    }
  );
}

onAuthStateChanged(auth, (user) => { currentUser = user; });

writeButton?.addEventListener('click', () => {
  if (!auth?.currentUser) return goLogin();
  writeForm?.reset();
  setStatus(writeStatus);
  openModal(writeModal);
});

writeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = auth?.currentUser;
  if (!user) return goLogin();

  const data = new FormData(writeForm);
  const category = String(data.get('category') || '이용 문의').trim();
  const title = String(data.get('title') || '').trim();
  const content = String(data.get('content') || '').trim();
  if (title.length < 2 || content.length < 5) return setStatus(writeStatus, '제목과 내용을 조금 더 입력해 주세요.', true);

  const submit = writeForm.querySelector('[type="submit"]');
  submit.disabled = true;
  setStatus(writeStatus, '문의를 등록하고 있습니다.');

  const postRef = doc(collection(db, 'questions'));
  const bodyRef = doc(db, 'questions', postRef.id, 'private', 'body');
  const now = Timestamp.now();
  const maskedName = maskName(user.displayName || '리림 회원');

  try {
    // 게시판 행을 먼저 저장한다. 이 저장이 끝나는 즉시 목록에 글이 보인다.
    await setDoc(postRef, {
      ownerUid: user.uid,
      userName: maskedName,
      category,
      title,
      status: '답변대기',
      createdAt: now,
      updatedAt: now
    });

    await setDoc(bodyRef, {
      ownerUid: user.uid,
      content,
      answer: '',
      createdAt: now,
      updatedAt: now
    });

    writeForm.reset();
    setStatus(writeStatus, '문의가 등록되었습니다.');
    window.setTimeout(() => {
      closeModal(writeModal);
      history.replaceState(null, '', `inquiry.html?id=${encodeURIComponent(postRef.id)}`);
      const post = postCache.get(postRef.id) || {
        id: postRef.id,
        ownerUid: user.uid,
        userName: maskedName,
        category,
        title,
        status: '답변대기',
        createdAt: now,
        updatedAt: now
      };
      openPost(post, false);
    }, 220);
  } catch (error) {
    console.error('[RE:LIM QUESTION CREATE]', error);
    setStatus(writeStatus, `문의 등록에 실패했습니다. (${error?.code || 'unknown'})`, true);
  } finally {
    submit.disabled = false;
  }
});

detailModal?.querySelector('[data-question-edit]')?.addEventListener('click', () => {
  if (!activePost || !auth?.currentUser || activePost.ownerUid !== auth.currentUser.uid) return;
  editForm.elements.category.value = activePost.category || '이용 문의';
  editForm.elements.title.value = activePost.title || '';
  editForm.elements.content.value = activePost.content || '';
  setStatus(editStatus);
  closeModal(detailModal);
  openModal(editModal);
});

editForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeId || !activePost || !auth?.currentUser || activePost.ownerUid !== auth.currentUser.uid) return;

  const data = new FormData(editForm);
  const category = String(data.get('category') || '이용 문의').trim();
  const title = String(data.get('title') || '').trim();
  const content = String(data.get('content') || '').trim();
  const submit = editForm.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'questions', activeId), { category, title, updatedAt: now });
    await updateDoc(doc(db, 'questions', activeId, 'private', 'body'), { content, updatedAt: now });
    setStatus(editStatus, '문의가 수정되었습니다.');
    window.setTimeout(() => {
      closeModal(editModal);
      location.href = `inquiry.html?id=${encodeURIComponent(activeId)}`;
    }, 180);
  } catch (error) {
    console.error('[RE:LIM QUESTION EDIT]', error);
    setStatus(editStatus, '문의 수정에 실패했습니다.', true);
  } finally {
    submit.disabled = false;
  }
});

detailModal?.querySelector('[data-question-delete]')?.addEventListener('click', async () => {
  if (!activeId || !activePost || !auth?.currentUser) return;
  const user = auth.currentUser;
  if (activePost.ownerUid !== user.uid && !isAdmin(user)) return;
  if (!confirm('이 문의를 삭제할까요?')) return;
  try {
    await deleteDoc(doc(db, 'questions', activeId, 'private', 'body'));
    await deleteDoc(doc(db, 'questions', activeId));
    activeId = null;
    activePost = null;
    closeModal(detailModal);
    history.replaceState(null, '', 'inquiry.html');
  } catch (error) {
    console.error('[RE:LIM QUESTION DELETE]', error);
    window.alert('문의 삭제에 실패했습니다.');
  }
});

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeId || !auth?.currentUser || !isAdmin(auth.currentUser)) return;
  const answer = String(new FormData(answerForm).get('answer') || '').trim();
  if (answer.length < 2) return setStatus(answerStatus, '답변 내용을 입력해 주세요.', true);

  const submit = answerForm.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'questions', activeId, 'private', 'body'), {
      answer,
      answeredAt: now,
      answeredBy: auth.currentUser.email || 'RE:LIM',
      updatedAt: now
    });
    await updateDoc(doc(db, 'questions', activeId), { status: '답변완료', updatedAt: now });
    setStatus(answerStatus, '답변이 등록되었습니다.');
    const post = postCache.get(activeId);
    if (post) openPost({ ...post, status: '답변완료' }, false);
  } catch (error) {
    console.error('[RE:LIM QUESTION ANSWER]', error);
    setStatus(answerStatus, '답변 등록에 실패했습니다.', true);
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
});
