import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

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

const currentFileName = () => window.location.pathname.split('/').pop() || 'index.html';
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
  document.body.style.overflow = '';
};

async function compressReviewImage(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 첨부할 수 있습니다.');
  if (file.size > 12 * 1024 * 1024) throw new Error('이미지는 12MB 이하 파일을 선택해 주세요.');

  const bitmap = await createImageBitmap(file);
  const maxSide = 1400;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let dataUrl = canvas.toDataURL('image/jpeg', 0.76);
  if (dataUrl.length > 720000) dataUrl = canvas.toDataURL('image/jpeg', 0.58);
  if (dataUrl.length > 850000) throw new Error('사진 용량이 큽니다. 조금 더 작은 이미지를 선택해 주세요.');
  return dataUrl;
}

function initReviews() {
  const root = document.querySelector('[data-reviews-page]');
  if (!root || !db) return;

  const grid = root.querySelector('[data-review-grid]');
  const empty = root.querySelector('[data-review-empty]');
  const count = root.querySelector('[data-review-count]');
  const writeButton = root.querySelector('[data-review-write]');
  const writeModal = document.getElementById('reviewWriteModal');
  const detailModal = document.getElementById('reviewDetailModal');
  const form = document.getElementById('reviewForm');
  const formStatus = document.getElementById('reviewFormStatus');
  let currentUser = null;
  let reviewCache = new Map();

  onAuthStateChanged(auth, (user) => { currentUser = user; });

  writeButton?.addEventListener('click', () => {
    if (!currentUser) return goLogin();
    setStatus(formStatus);
    openModal(writeModal);
  });

  document.querySelectorAll('[data-community-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.community-modal')));
  });
  document.querySelectorAll('.community-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  const renderDetail = (id) => {
    const review = reviewCache.get(id);
    if (!review || !detailModal) return;
    const title = detailModal.querySelector('[data-review-detail-title]');
    const meta = detailModal.querySelector('[data-review-detail-meta]');
    const content = detailModal.querySelector('[data-review-detail-content]');
    const image = detailModal.querySelector('[data-review-detail-image]');
    if (title) title.textContent = review.title;
    if (meta) meta.textContent = `${review.userName || '리림 회원'} · ${formatDate(review.createdAt)}`;
    if (content) content.textContent = review.content;
    if (image) {
      image.hidden = !review.imageDataUrl;
      image.src = review.imageDataUrl || '';
      image.alt = review.title || '리림 리뷰 사진';
    }
    openModal(detailModal);
  };

  const reviewsQuery = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
  onSnapshot(reviewsQuery, (snapshot) => {
    reviewCache = new Map();
    grid?.replaceChildren();
    snapshot.docs.forEach((snapshotDoc) => {
      const review = { id: snapshotDoc.id, ...snapshotDoc.data() };
      reviewCache.set(review.id, review);

      const article = document.createElement('article');
      article.className = 'review-card';
      article.tabIndex = 0;
      article.dataset.reviewId = review.id;

      const media = document.createElement('div');
      media.className = 'review-card-media';
      if (review.imageDataUrl) {
        const image = document.createElement('img');
        image.src = review.imageDataUrl;
        image.alt = review.title || '리림 이용 리뷰';
        media.append(image);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'review-card-placeholder';
        placeholder.textContent = 'RE:LIM REVIEW';
        media.append(placeholder);
      }

      const copy = document.createElement('div');
      copy.className = 'review-card-copy';
      const meta = document.createElement('div');
      meta.className = 'review-card-meta';
      const author = document.createElement('span');
      author.textContent = review.userName || '리림 회원';
      const date = document.createElement('span');
      date.textContent = formatDate(review.createdAt);
      meta.append(author, date);
      const heading = document.createElement('h3');
      heading.textContent = review.title || '리림 이용 리뷰';
      const excerpt = document.createElement('p');
      excerpt.className = 'review-card-excerpt';
      excerpt.textContent = review.content || '';
      copy.append(meta, heading, excerpt);
      article.append(media, copy);
      article.addEventListener('click', () => renderDetail(review.id));
      article.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          renderDetail(review.id);
        }
      });
      grid?.append(article);
    });
    if (count) count.textContent = String(snapshot.size);
    if (empty) empty.hidden = snapshot.size > 0;
  }, (error) => {
    console.error(error);
    if (empty) {
      empty.hidden = false;
      empty.textContent = '리뷰를 불러오지 못했습니다. Firestore Rules 게시 상태를 확인해 주세요.';
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return goLogin();
    const submit = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const content = String(data.get('content') || '').trim();
    const imageFile = data.get('image');
    if (title.length < 2 || content.length < 5) return setStatus(formStatus, '제목과 리뷰 내용을 조금 더 입력해 주세요.', true);

    submit.disabled = true;
    setStatus(formStatus, '리뷰를 등록하고 있습니다.');
    try {
      const imageDataUrl = imageFile?.size ? await compressReviewImage(imageFile) : '';
      await addDoc(collection(db, 'reviews'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || '리림 회원',
        email: currentUser.email || '',
        title,
        content,
        imageDataUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      form.reset();
      setStatus(formStatus, '리뷰가 등록되었습니다.');
      window.setTimeout(() => closeModal(writeModal), 650);
    } catch (error) {
      console.error(error);
      setStatus(formStatus, error.message || '리뷰 등록 중 오류가 발생했습니다.', true);
    } finally {
      submit.disabled = false;
    }
  });
}

function initInquiry() {
  const root = document.querySelector('[data-inquiry-page]');
  if (!root || !db) return;
  const form = root.querySelector('[data-inquiry-form]');
  const formWrap = root.querySelector('[data-inquiry-authenticated]');
  const loginWrap = root.querySelector('[data-inquiry-login]');
  const loginButton = root.querySelector('[data-inquiry-login-button]');
  const status = root.querySelector('[data-inquiry-status]');
  let currentUser = null;

  loginButton?.addEventListener('click', goLogin);

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (formWrap) formWrap.hidden = !user;
    if (loginWrap) loginWrap.hidden = Boolean(user);
    if (user) {
      const emailField = form?.querySelector('[name="email"]');
      if (emailField) emailField.value = user.email || '';
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return goLogin();
    const submit = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const content = String(data.get('content') || '').trim();
    if (title.length < 2 || content.length < 5) return setStatus(status, '문의 제목과 내용을 입력해 주세요.', true);

    submit.disabled = true;
    setStatus(status, '문의를 접수하고 있습니다.');
    try {
      await addDoc(collection(db, 'inquiries'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || '리림 회원',
        email: currentUser.email || '',
        category: String(data.get('category') || '이용 문의'),
        title,
        content,
        contact: String(data.get('contact') || '').trim(),
        status: '접수',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      form.reset();
      const emailField = form.querySelector('[name="email"]');
      if (emailField) emailField.value = currentUser.email || '';
      setStatus(status, '문의가 정상적으로 접수되었습니다. 마이페이지에서 확인할 수 있습니다.');
    } catch (error) {
      console.error(error);
      setStatus(status, '문의 접수 중 오류가 발생했습니다. Firestore Rules를 확인해 주세요.', true);
    } finally {
      submit.disabled = false;
    }
  });
}

function initMyPage() {
  const root = document.querySelector('[data-mypage]');
  if (!root || !db) return;
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

  const renderRows = (target, docs, type) => {
    if (!target) return;
    target.replaceChildren();
    const sorted = [...docs].sort((a, b) => {
      const aDate = a.data().createdAt?.toMillis?.() || 0;
      const bDate = b.data().createdAt?.toMillis?.() || 0;
      return bDate - aDate;
    });
    if (!sorted.length) {
      const empty = document.createElement('div');
      empty.className = 'community-empty';
      empty.textContent = type === 'inquiry' ? '아직 등록한 문의가 없습니다.' : '아직 작성한 리뷰가 없습니다.';
      target.append(empty);
      return;
    }

    sorted.forEach((snapshotDoc) => {
      const item = snapshotDoc.data();
      const row = document.createElement('div');
      row.className = 'mypage-row';
      const kind = document.createElement('span');
      kind.className = 'mypage-row-kind';
      kind.textContent = type === 'inquiry' ? (item.category || '문의') : '리뷰';
      const title = document.createElement('span');
      title.className = 'mypage-row-title';
      title.textContent = item.title || (type === 'inquiry' ? '문의' : '리뷰');
      const date = document.createElement('span');
      date.className = 'mypage-row-date';
      date.textContent = formatDate(item.createdAt);
      const actions = document.createElement('div');
      if (type === 'inquiry') {
        const state = document.createElement('span');
        state.className = 'mypage-status';
        state.textContent = item.status || '접수';
        actions.append(state);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mypage-delete';
      remove.textContent = '삭제';
      remove.addEventListener('click', async () => {
        if (!window.confirm('이 글을 삭제할까요?')) return;
        await deleteDoc(doc(db, type === 'inquiry' ? 'inquiries' : 'reviews', snapshotDoc.id));
      });
      actions.append(remove);
      row.append(kind, title, date, actions);
      target.append(row);
    });
  };

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html?return=mypage.html';
      return;
    }
    if (loading) loading.hidden = true;
    if (account) account.hidden = false;
    if (name) name.textContent = user.displayName || '리림 회원';
    if (email) email.textContent = user.email || '';
    if (avatar) avatar.textContent = (user.displayName || user.email || 'R').charAt(0).toUpperCase();

    const inquiryQuery = query(collection(db, 'inquiries'), where('userId', '==', user.uid));
    const reviewQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
    onSnapshot(inquiryQuery, (snapshot) => {
      if (inquiryCount) inquiryCount.textContent = String(snapshot.size);
      renderRows(inquiryList, snapshot.docs, 'inquiry');
    });
    onSnapshot(reviewQuery, (snapshot) => {
      if (reviewCount) reviewCount.textContent = String(snapshot.size);
      renderRows(reviewList, snapshot.docs, 'review');
    });
  });

  logoutButton?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

initReviews();
initInquiry();
initMyPage();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.querySelectorAll('.community-modal.is-open').forEach(closeModal);
});
