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
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const ADMIN_EMAILS = new Set(['planus253@naver.com']);

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

const isAdmin = (user) => ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());

const setStatus = (element, message = '', isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
  element.hidden = !message;
};

const currentFileName = () => `${window.location.pathname.split('/').pop() || 'index.html'}${window.location.search || ''}`;
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

function bindCommunityModals() {
  document.querySelectorAll('[data-community-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.community-modal')));
  });
  document.querySelectorAll('.community-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
}

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

  const renderDetail = (id) => {
    const review = reviewCache.get(id);
    if (!review || !detailModal) return;
    detailModal.querySelector('[data-review-detail-title]').textContent = review.title || '리림 이용 리뷰';
    detailModal.querySelector('[data-review-detail-meta]').textContent = `${review.userName || '리림 회원'} · ${formatDate(review.createdAt)}`;
    detailModal.querySelector('[data-review-detail-content]').textContent = review.content || '';
    const image = detailModal.querySelector('[data-review-detail-image]');
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
    snapshot.docs.forEach((snapshotDoc) => {
      const review = { id: snapshotDoc.id, ...snapshotDoc.data() };
      reviewCache.set(review.id, review);
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
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); renderDetail(review.id); }
      });
      grid?.append(article);
    });
    if (count) count.textContent = String(snapshot.size);
    if (empty) empty.hidden = snapshot.size > 0;
  }, (error) => {
    console.error(error);
    if (empty) { empty.hidden = false; empty.textContent = '리뷰를 불러오지 못했습니다. Firestore Rules 게시 상태를 확인해 주세요.'; }
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
        userName: maskName(currentUser.displayName || '리림 회원'),
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

  const list = root.querySelector('[data-inquiry-list]');
  const empty = root.querySelector('[data-inquiry-empty]');
  const count = root.querySelector('[data-inquiry-count]');
  const writeButtons = [...root.querySelectorAll('[data-inquiry-write]')];
  const writeModal = document.getElementById('inquiryWriteModal');
  const detailModal = document.getElementById('inquiryDetailModal');
  const writeForm = root.querySelector('[data-inquiry-form]');
  const writeStatus = root.querySelector('[data-inquiry-status]');
  const answerForm = detailModal?.querySelector('[data-inquiry-answer-form]');
  const answerStatus = detailModal?.querySelector('[data-inquiry-answer-status]');
  let currentUser = null;
  let inquiryCache = new Map();
  let activeInquiryId = null;
  let openedFromUrl = false;

  const stateLabel = (item) => item?.answer || item?.status === '답변완료' ? '답변완료' : '답변대기';

  const renderDetail = (id, syncUrl = true) => {
    const item = inquiryCache.get(id);
    if (!item || !detailModal) return;
    activeInquiryId = id;
    detailModal.querySelector('[data-inquiry-detail-category]').textContent = item.category || '문의';
    detailModal.querySelector('[data-inquiry-detail-title]').textContent = item.title || '문의';
    detailModal.querySelector('[data-inquiry-detail-meta]').textContent = `${maskName(item.userName)} · ${formatDate(item.createdAt)}`;
    detailModal.querySelector('[data-inquiry-detail-content]').textContent = item.content || '';

    const state = detailModal.querySelector('[data-inquiry-detail-state]');
    const completed = stateLabel(item) === '답변완료';
    state.textContent = completed ? '답변완료' : '답변대기';
    state.classList.toggle('is-complete', completed);

    const answerView = detailModal.querySelector('[data-inquiry-answer-view]');
    const answerText = detailModal.querySelector('[data-inquiry-answer-text]');
    const answerDate = detailModal.querySelector('[data-inquiry-answer-date]');
    if (answerView) answerView.hidden = !item.answer;
    if (answerText) answerText.textContent = item.answer || '';
    if (answerDate) answerDate.textContent = item.answer ? `답변일 ${formatDate(item.answeredAt)}` : '';

    const adminReply = detailModal.querySelector('[data-inquiry-admin-reply]');
    if (adminReply) adminReply.hidden = !isAdmin(currentUser);
    const answerInput = answerForm?.querySelector('[name="answer"]');
    if (answerInput) answerInput.value = item.answer || '';
    setStatus(answerStatus);

    if (syncUrl) history.replaceState(null, '', `inquiry.html?id=${encodeURIComponent(id)}`);
    openModal(detailModal);
  };

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (activeInquiryId && detailModal?.classList.contains('is-open')) renderDetail(activeInquiryId, false);
  });

  writeButtons.forEach((button) => button.addEventListener('click', () => {
    if (!currentUser) return goLogin();
    setStatus(writeStatus);
    openModal(writeModal);
  }));

  onSnapshot(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')), (snapshot) => {
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
  }, (error) => {
    console.error(error);
    if (empty) { empty.hidden = false; empty.textContent = '문의 게시판을 불러오지 못했습니다. Firestore Rules 게시 상태를 확인해 주세요.'; }
  });

  writeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return goLogin();
    const submit = writeForm.querySelector('[type="submit"]');
    const data = new FormData(writeForm);
    const title = String(data.get('title') || '').trim();
    const content = String(data.get('content') || '').trim();
    if (title.length < 2 || content.length < 5) return setStatus(writeStatus, '문의 제목과 내용을 조금 더 입력해 주세요.', true);

    submit.disabled = true;
    setStatus(writeStatus, '문의 글을 등록하고 있습니다.');
    try {
      await addDoc(collection(db, 'inquiries'), {
        userId: currentUser.uid,
        userName: maskName(currentUser.displayName || '리림 회원'),
        category: String(data.get('category') || '이용 문의'),
        title,
        content,
        status: '답변대기',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      writeForm.reset();
      setStatus(writeStatus, '문의가 등록되었습니다. 마이페이지에서도 확인할 수 있습니다.');
      window.setTimeout(() => closeModal(writeModal), 650);
    } catch (error) {
      console.error(error);
      setStatus(writeStatus, '문의 등록 중 오류가 발생했습니다. Firestore Rules를 확인해 주세요.', true);
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
      console.error(error);
      setStatus(answerStatus, '답변 등록 권한을 확인해 주세요.', true);
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
      const row = document.createElement('div');
      row.className = 'mypage-row';
      const kind = document.createElement('span');
      kind.className = 'mypage-row-kind';
      kind.textContent = type === 'inquiry' ? (item.category || '문의') : '리뷰';
      const title = type === 'inquiry' ? document.createElement('a') : document.createElement('span');
      title.className = `mypage-row-title${type === 'inquiry' ? ' is-link' : ''}`;
      title.textContent = item.title || (type === 'inquiry' ? '문의' : '리뷰');
      if (type === 'inquiry') title.href = `inquiry.html?id=${encodeURIComponent(snapshotDoc.id)}`;
      const date = document.createElement('span');
      date.className = 'mypage-row-date';
      date.textContent = formatDate(item.createdAt);
      const actions = document.createElement('div');
      if (type === 'inquiry') {
        const state = document.createElement('span');
        const completed = Boolean(item.answer) || item.status === '답변완료';
        state.className = `mypage-status${completed ? ' is-complete' : ''}`;
        state.textContent = completed ? '답변완료' : '답변대기';
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
    if (!user) { window.location.href = 'login.html?return=mypage.html'; return; }
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
}

bindCommunityModals();
initReviews();
initInquiry();
initMyPage();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.community-modal.is-open').forEach(closeModal);
    if (location.pathname.endsWith('/inquiry.html') && new URLSearchParams(location.search).has('id')) history.replaceState(null, '', 'inquiry.html');
  }
});
