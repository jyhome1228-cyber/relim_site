import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const root = document.querySelector('[data-mypage]');

const formatDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return '방금 전';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
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

async function compressImage(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 첨부할 수 있습니다.');
  if (file.size > 12 * 1024 * 1024) throw new Error('이미지는 12MB 이하 파일을 선택해 주세요.');
  const bitmap = await createImageBitmap(file);
  const maxSide = 1400;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let dataUrl = canvas.toDataURL('image/jpeg', 0.76);
  if (dataUrl.length > 720000) dataUrl = canvas.toDataURL('image/jpeg', 0.58);
  if (dataUrl.length > 850000) throw new Error('사진 용량이 큽니다. 조금 더 작은 이미지를 선택해 주세요.');
  return dataUrl;
}

function init() {
  if (!root || !auth || !db) return;

  const loading = root.querySelector('[data-mypage-loading]');
  const account = root.querySelector('[data-mypage-account]');
  const name = root.querySelector('[data-mypage-name]');
  const email = root.querySelector('[data-mypage-email]');
  const avatar = root.querySelector('[data-mypage-avatar]');
  const inquiryCount = root.querySelector('[data-inquiry-count]');
  const reviewCount = root.querySelector('[data-my-review-count]');
  const inquiryList = root.querySelector('[data-my-inquiries]');
  const reviewList = root.querySelector('[data-my-reviews]');
  const logoutButton = root.querySelector('[data-mypage-logout]');

  const inquiryModal = document.getElementById('mypageInquiryEditModal');
  const reviewModal = document.getElementById('mypageReviewEditModal');
  const inquiryForm = inquiryModal?.querySelector('[data-my-inquiry-edit-form]');
  const reviewForm = reviewModal?.querySelector('[data-my-review-edit-form]');
  const inquiryStatus = inquiryModal?.querySelector('[data-my-inquiry-edit-status]');
  const reviewStatus = reviewModal?.querySelector('[data-my-review-edit-status]');
  const ratingPicker = reviewForm?.querySelector('[data-my-rating-picker]');
  const ratingValue = reviewForm?.querySelector('[data-my-rating-value]');
  const ratingLabel = reviewForm?.querySelector('[data-my-rating-label]');
  const ratingButtons = ratingPicker ? [...ratingPicker.querySelectorAll('[data-rating]')] : [];

  let currentUser = null;
  let activeInquiry = null;
  let activeReview = null;

  const setRating = (value) => {
    const rating = Number(value) || 0;
    if (ratingValue) ratingValue.value = rating ? String(rating) : '';
    ratingButtons.forEach((button) => {
      const buttonValue = Number(button.dataset.rating);
      button.classList.toggle('is-active', buttonValue <= rating);
      button.setAttribute('aria-pressed', String(buttonValue === rating));
    });
    if (ratingLabel) ratingLabel.textContent = rating ? `${rating}.0 / 5.0` : '별점을 선택해 주세요';
  };
  ratingButtons.forEach((button) => button.addEventListener('click', () => setRating(button.dataset.rating)));

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

  const renderRows = (target, docs, type) => {
    if (!target) return;
    target.replaceChildren();
    const sorted = [...docs].sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));
    if (!sorted.length) {
      const empty = document.createElement('div');
      empty.className = 'community-empty';
      empty.textContent = type === 'inquiry' ? '아직 등록한 문의가 없습니다.' : '아직 작성한 리뷰가 없습니다.';
      target.append(empty);
      return;
    }

    sorted.forEach((snapshotDoc) => {
      const item = snapshotDoc.data();
      const id = snapshotDoc.id;
      const row = document.createElement('div');
      row.className = 'mypage-row';

      const kind = document.createElement('span');
      kind.className = 'mypage-row-kind';
      if (type === 'inquiry') kind.textContent = item.category || '문의';
      else kind.textContent = item.rating ? `${item.rating}.0 / 5` : '리뷰';

      const title = type === 'inquiry' ? document.createElement('a') : document.createElement('span');
      title.className = `mypage-row-title${type === 'inquiry' ? ' is-link' : ''}`;
      title.textContent = item.title || (type === 'inquiry' ? '문의' : '리뷰');
      if (type === 'inquiry') title.href = `inquiry.html?id=${encodeURIComponent(id)}`;

      const date = document.createElement('span');
      date.className = 'mypage-row-date';
      date.textContent = formatDate(item.updatedAt || item.createdAt);

      const actions = document.createElement('div');
      actions.className = 'mypage-row-actions';

      if (type === 'inquiry') {
        const state = document.createElement('span');
        const completed = Boolean(item.answer) || item.status === '답변완료';
        state.className = `mypage-status${completed ? ' is-complete' : ''}`;
        state.textContent = completed ? '답변완료' : '답변대기';
        actions.append(state);

        actions.append(makeButton('수정', 'mypage-edit', () => {
          activeInquiry = { id, ...item };
          inquiryForm.elements.category.value = item.category || '이용 문의';
          inquiryForm.elements.title.value = item.title || '';
          inquiryForm.elements.content.value = item.content || '';
          setStatus(inquiryStatus);
          openModal(inquiryModal);
        }));
      } else {
        actions.append(makeButton('수정', 'mypage-edit', () => {
          activeReview = { id, ...item };
          reviewForm.reset();
          reviewForm.elements.title.value = item.title || '';
          reviewForm.elements.content.value = item.content || '';
          setRating(Number(item.rating) || 0);
          setStatus(reviewStatus);
          openModal(reviewModal);
        }));
      }

      actions.append(makeButton('삭제', 'mypage-delete', async () => {
        if (!window.confirm('이 글을 삭제할까요?')) return;
        try {
          if (type === 'inquiry') {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'inquiries', id));
            batch.delete(doc(db, 'inquiryIndex', id));
            await batch.commit();
          } else {
            await deleteDoc(doc(db, 'reviews', id));
          }
        } catch (error) {
          console.error(error);
          window.alert('삭제 권한을 확인해 주세요.');
        }
      }));

      row.append(kind, title, date, actions);
      target.append(row);
    });
  };

  inquiryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeInquiry || !currentUser || activeInquiry.userId !== currentUser.uid) return;
    const submit = inquiryForm.querySelector('[type="submit"]');
    const data = new FormData(inquiryForm);
    const category = String(data.get('category') || '이용 문의');
    const title = String(data.get('title') || '').trim();
    const content = String(data.get('content') || '').trim();
    if (title.length < 2 || content.length < 5) return setStatus(inquiryStatus, '문의 제목과 내용을 조금 더 입력해 주세요.', true);
    submit.disabled = true;
    setStatus(inquiryStatus, '문의를 수정하고 있습니다.');
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'inquiries', activeInquiry.id), { category, title, content, updatedAt: serverTimestamp() });
      batch.update(doc(db, 'inquiryIndex', activeInquiry.id), { category, title, updatedAt: serverTimestamp() });
      await batch.commit();
      setStatus(inquiryStatus, '문의가 수정되었습니다.');
      window.setTimeout(() => closeModal(inquiryModal), 450);
    } catch (error) {
      console.error(error);
      setStatus(inquiryStatus, '문의 수정 권한 또는 Firestore Rules를 확인해 주세요.', true);
    } finally {
      submit.disabled = false;
    }
  });

  reviewForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeReview || !currentUser || activeReview.userId !== currentUser.uid) return;
    const submit = reviewForm.querySelector('[type="submit"]');
    const data = new FormData(reviewForm);
    const rating = Number(data.get('rating'));
    const title = String(data.get('title') || '').trim();
    const content = String(data.get('content') || '').trim();
    const imageFile = data.get('image');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return setStatus(reviewStatus, '별점을 선택해 주세요.', true);
    if (title.length < 2 || content.length < 5) return setStatus(reviewStatus, '제목과 리뷰 내용을 조금 더 입력해 주세요.', true);
    submit.disabled = true;
    setStatus(reviewStatus, '리뷰를 수정하고 있습니다.');
    try {
      const changes = { rating, title, content, updatedAt: serverTimestamp() };
      if (imageFile?.size) changes.imageDataUrl = await compressImage(imageFile);
      await updateDoc(doc(db, 'reviews', activeReview.id), changes);
      setStatus(reviewStatus, '리뷰가 수정되었습니다.');
      window.setTimeout(() => closeModal(reviewModal), 450);
    } catch (error) {
      console.error(error);
      setStatus(reviewStatus, error.message || '리뷰 수정 권한 또는 Firestore Rules를 확인해 주세요.', true);
    } finally {
      submit.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
      window.location.href = 'login.html?return=mypage.html';
      return;
    }
    if (loading) loading.hidden = true;
    if (account) account.hidden = false;
    if (name) name.textContent = user.displayName || '리림 회원';
    if (email) email.textContent = user.email || '';
    if (avatar) avatar.textContent = (user.displayName || user.email || 'R').charAt(0).toUpperCase();

    onSnapshot(query(collection(db, 'inquiries'), where('userId', '==', user.uid)), (snapshot) => {
      if (inquiryCount) inquiryCount.textContent = String(snapshot.size);
      renderRows(inquiryList, snapshot.docs, 'inquiry');
    });
    onSnapshot(query(collection(db, 'reviews'), where('userId', '==', user.uid)), (snapshot) => {
      if (reviewCount) reviewCount.textContent = String(snapshot.size);
      renderRows(reviewList, snapshot.docs, 'review');
    });
  });

  logoutButton?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelectorAll('.community-modal.is-open').forEach(closeModal);
  });
}

init();
