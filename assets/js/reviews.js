import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
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

const maskName = (value) => {
  const name = String(value || '리림 회원').trim();
  if (name.length <= 1) return `${name}*`;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(Math.min(2, name.length - 1))}`;
};

const setStatus = (element, message = '', isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
  element.hidden = !message;
};

const goLogin = () => {
  const returnUrl = `${window.location.pathname.split('/').pop() || 'reviews.html'}${window.location.search || ''}`;
  window.location.href = `login.html?return=${encodeURIComponent(returnUrl)}`;
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

const renderStars = (rating, withNumber = false) => {
  const value = Number(rating);
  if (!Number.isFinite(value) || value < 1) return '';
  const rounded = Math.max(1, Math.min(5, Math.round(value)));
  const stars = `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
  return withNumber ? `${stars} ${value.toFixed(1)}` : stars;
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
  if (!root || !db || !auth) return;

  const grid = root.querySelector('[data-review-grid]');
  const empty = root.querySelector('[data-review-empty]');
  const count = root.querySelector('[data-review-count]');
  const average = root.querySelector('[data-review-average]');
  const writeButton = root.querySelector('[data-review-write]');
  const writeModal = document.getElementById('reviewWriteModal');
  const detailModal = document.getElementById('reviewDetailModal');
  const form = document.getElementById('reviewForm');
  const formStatus = document.getElementById('reviewFormStatus');
  const ratingPicker = form?.querySelector('[data-rating-picker]');
  const ratingValue = form?.querySelector('[data-rating-value]');
  const ratingLabel = form?.querySelector('[data-rating-label]');
  const ratingButtons = ratingPicker ? [...ratingPicker.querySelectorAll('[data-rating]')] : [];
  let currentUser = null;
  let reviewCache = new Map();

  const setRating = (value) => {
    const rating = Number(value) || 0;
    if (ratingValue) ratingValue.value = rating ? String(rating) : '';
    ratingButtons.forEach((button) => {
      const active = Number(button.dataset.rating) <= rating;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(Number(button.dataset.rating) === rating));
    });
    if (ratingLabel) ratingLabel.textContent = rating ? `${rating}.0 / 5.0` : '별점을 선택해 주세요';
  };

  ratingButtons.forEach((button) => button.addEventListener('click', () => setRating(button.dataset.rating)));

  onAuthStateChanged(auth, (user) => { currentUser = user; });

  writeButton?.addEventListener('click', () => {
    if (!currentUser) return goLogin();
    setStatus(formStatus);
    setRating(0);
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
    const detailRating = detailModal.querySelector('[data-review-detail-rating]');
    const content = detailModal.querySelector('[data-review-detail-content]');
    const image = detailModal.querySelector('[data-review-detail-image]');
    if (title) title.textContent = review.title || '리림 이용 리뷰';
    if (meta) meta.textContent = `${review.userName || '리림 회원'} · ${formatDate(review.createdAt)}`;
    if (detailRating) detailRating.textContent = review.rating ? renderStars(review.rating, true) : '별점 없음';
    if (content) content.textContent = review.content || '';
    if (image) {
      image.hidden = !review.imageDataUrl;
      image.src = review.imageDataUrl || '';
      image.alt = review.title || '리림 리뷰 사진';
    }
    openModal(detailModal);
  };

  onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snapshot) => {
    reviewCache = new Map();
    grid?.replaceChildren();
    let ratingTotal = 0;
    let ratingCount = 0;

    snapshot.docs.forEach((snapshotDoc) => {
      const review = { id: snapshotDoc.id, ...snapshotDoc.data() };
      reviewCache.set(review.id, review);
      if (Number(review.rating) >= 1 && Number(review.rating) <= 5) {
        ratingTotal += Number(review.rating);
        ratingCount += 1;
      }

      const article = document.createElement('article');
      article.className = 'review-card';
      article.tabIndex = 0;

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
      const stars = document.createElement('div');
      stars.className = 'review-card-rating';
      stars.textContent = review.rating ? renderStars(review.rating) : '별점 없음';
      const heading = document.createElement('h3');
      heading.textContent = review.title || '리림 이용 리뷰';
      const excerpt = document.createElement('p');
      excerpt.className = 'review-card-excerpt';
      excerpt.textContent = review.content || '';
      const meta = document.createElement('div');
      meta.className = 'review-card-meta';
      const author = document.createElement('span');
      author.textContent = review.userName || '리림 회원';
      const date = document.createElement('span');
      date.textContent = formatDate(review.createdAt);
      meta.append(author, date);
      copy.append(stars, heading, excerpt, meta);
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
    if (average) average.textContent = ratingCount ? (ratingTotal / ratingCount).toFixed(1) : '0.0';
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
    const rating = Number(data.get('rating'));
    const imageFile = data.get('image');

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return setStatus(formStatus, '별점을 선택해 주세요.', true);
    if (title.length < 2 || content.length < 5) return setStatus(formStatus, '제목과 리뷰 내용을 조금 더 입력해 주세요.', true);

    submit.disabled = true;
    setStatus(formStatus, '리뷰를 등록하고 있습니다.');
    try {
      const imageDataUrl = imageFile?.size ? await compressReviewImage(imageFile) : '';
      await addDoc(collection(db, 'reviews'), {
        userId: currentUser.uid,
        userName: maskName(currentUser.displayName || '리림 회원'),
        rating,
        title,
        content,
        imageDataUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      form.reset();
      setRating(0);
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

initReviews();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.querySelectorAll('.community-modal.is-open').forEach(closeModal);
});
