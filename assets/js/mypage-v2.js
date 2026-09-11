import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const root = document.querySelector('[data-mypage]');

function cleanupReviewDom() {
  document.querySelectorAll('[data-my-review-count],[data-my-reviews],#mypageReviewEditModal,a[href*="reviews.html"],a[href*="review.html"]').forEach((element) => {
    const summaryItem = element.closest('.mypage-summary > div');
    const block = element.closest('.mypage-block');
    if (summaryItem) summaryItem.remove();
    else if (block) block.remove();
    else element.remove();
  });
  const heroCopy = root?.querySelector('.community-hero p:last-child');
  if (heroCopy) heroCopy.textContent = '내가 남긴 문의와 계정 정보를 확인하고 직접 관리할 수 있습니다.';
  const summary = root?.querySelector('.mypage-summary');
  if (summary) summary.style.gridTemplateColumns = 'minmax(0,1fr)';
}

cleanupReviewDom();

function formatDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function setStatus(element, message = '', isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
  element.hidden = !message;
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('is-open');
  if (!document.querySelector('.community-modal.is-open')) document.body.style.overflow = '';
}

function init() {
  if (!root || !auth || !db) return;
  const loading = root.querySelector('[data-mypage-loading]');
  const account = root.querySelector('[data-mypage-account]');
  const name = root.querySelector('[data-mypage-name]');
  const email = root.querySelector('[data-mypage-email]');
  const avatar = root.querySelector('[data-mypage-avatar]');
  const inquiryCount = root.querySelector('[data-inquiry-count]');
  const inquiryList = root.querySelector('[data-my-inquiries]');
  const logoutButton = root.querySelector('[data-mypage-logout]');
  const inquiryModal = document.getElementById('mypageInquiryEditModal');
  const inquiryForm = inquiryModal?.querySelector('[data-my-inquiry-edit-form]');
  const inquiryStatus = inquiryModal?.querySelector('[data-my-inquiry-edit-status]');

  let currentUser = null;
  let activeQuestion = null;

  document.querySelectorAll('[data-mypage-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.closest('.community-modal'))));
  document.querySelectorAll('.community-modal').forEach((modal) => modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal(modal);
  }));

  const makeButton = (label, className, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  };

  const renderQuestions = (docs) => {
    inquiryList?.replaceChildren();
    const sorted = [...docs].sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));
    if (!sorted.length) {
      const empty = document.createElement('div');
      empty.className = 'community-empty';
      empty.textContent = '아직 등록한 문의가 없습니다.';
      inquiryList?.append(empty);
      return;
    }

    sorted.forEach((snapshot) => {
      const item = snapshot.data();
      const id = snapshot.id;
      const row = document.createElement('div');
      row.className = 'mypage-row';

      const kind = document.createElement('span');
      kind.className = 'mypage-row-kind';
      kind.textContent = item.category || '문의';

      const title = document.createElement('a');
      title.className = 'mypage-row-title is-link';
      title.textContent = item.title || '문의';
      title.href = `inquiry.html?id=${encodeURIComponent(id)}`;

      const date = document.createElement('span');
      date.className = 'mypage-row-date';
      date.textContent = formatDate(item.updatedAt || item.createdAt);

      const actions = document.createElement('div');
      actions.className = 'mypage-row-actions';
      const status = document.createElement('span');
      status.className = `mypage-status${item.status === '답변완료' ? ' is-complete' : ''}`;
      status.textContent = item.status === '답변완료' ? '답변완료' : '답변대기';
      actions.append(status);

      actions.append(makeButton('수정', 'mypage-edit', async () => {
        try {
          const bodySnapshot = await getDoc(doc(db, 'questions', id, 'private', 'body'));
          if (!bodySnapshot.exists()) return;
          activeQuestion = { id, ...item, ...bodySnapshot.data() };
          inquiryForm.elements.category.value = item.category || '이용 문의';
          inquiryForm.elements.title.value = item.title || '';
          inquiryForm.elements.content.value = bodySnapshot.data().content || '';
          setStatus(inquiryStatus);
          openModal(inquiryModal);
        } catch (error) {
          console.error('[RE:LIM MYPAGE QUESTION]', error);
          window.alert('문의 내용을 불러오지 못했습니다.');
        }
      }));

      actions.append(makeButton('삭제', 'mypage-delete', async () => {
        if (!window.confirm('이 문의를 삭제할까요?')) return;
        try {
          await deleteDoc(doc(db, 'questions', id, 'private', 'body'));
          await deleteDoc(doc(db, 'questions', id));
        } catch (error) {
          console.error('[RE:LIM MYPAGE DELETE]', error);
          window.alert('문의 삭제에 실패했습니다.');
        }
      }));

      row.append(kind, title, date, actions);
      inquiryList?.append(row);
    });
  };

  inquiryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeQuestion || !currentUser || activeQuestion.ownerUid !== currentUser.uid) return;
    const submit = inquiryForm.querySelector('[type="submit"]');
    const data = new FormData(inquiryForm);
    const category = String(data.get('category') || '이용 문의').trim();
    const title = String(data.get('title') || '').trim();
    const content = String(data.get('content') || '').trim();
    submit.disabled = true;
    try {
      await updateDoc(doc(db, 'questions', activeQuestion.id), { category, title, updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'questions', activeQuestion.id, 'private', 'body'), { content, updatedAt: serverTimestamp() });
      setStatus(inquiryStatus, '문의가 수정되었습니다.');
      window.setTimeout(() => closeModal(inquiryModal), 350);
    } catch (error) {
      console.error('[RE:LIM MYPAGE UPDATE]', error);
      setStatus(inquiryStatus, '문의 수정에 실패했습니다.', true);
    } finally {
      submit.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
      location.href = 'login.html?return=mypage.html';
      return;
    }
    if (loading) loading.hidden = true;
    if (account) account.hidden = false;
    if (name) name.textContent = user.displayName || '리림 회원';
    if (email) email.textContent = user.email || '';
    if (avatar) avatar.textContent = (user.displayName || user.email || 'R').charAt(0).toUpperCase();

    onSnapshot(query(collection(db, 'questions'), where('ownerUid', '==', user.uid)), (snapshot) => {
      if (inquiryCount) inquiryCount.textContent = String(snapshot.size);
      renderQuestions(snapshot.docs);
    }, (error) => {
      console.error('[RE:LIM MYPAGE QUESTIONS]', error);
      if (inquiryList) inquiryList.innerHTML = '<div class="community-empty">문의 목록을 불러오지 못했습니다.</div>';
    });
  });

  logoutButton?.addEventListener('click', async () => {
    await signOut(auth);
    location.href = 'index.html';
  });
}

init();
