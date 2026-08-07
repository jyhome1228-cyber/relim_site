import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const detailModal = document.getElementById('inquiryDetailModal');
const editModal = document.getElementById('inquiryEditModal');
const ownerActions = detailModal?.querySelector('[data-inquiry-owner-actions]');
const editButton = detailModal?.querySelector('[data-inquiry-edit]');
const editForm = editModal?.querySelector('[data-inquiry-edit-form]');
const editStatus = editModal?.querySelector('[data-inquiry-edit-status]');
let currentUser = null;
let activeId = null;
let activeData = null;

const setStatus = (message = '', isError = false) => {
  if (!editStatus) return;
  editStatus.textContent = message;
  editStatus.classList.toggle('is-error', isError);
  editStatus.hidden = !message;
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

const getCurrentId = () => new URLSearchParams(location.search).get('id');

async function syncOwnerState() {
  if (!db || !ownerActions) return;
  const id = getCurrentId();
  activeId = id;
  activeData = null;
  ownerActions.hidden = true;
  if (!id || !currentUser) return;
  try {
    const snapshot = await getDoc(doc(db, 'inquiries', id));
    if (!snapshot.exists()) return;
    activeData = snapshot.data();
    ownerActions.hidden = activeData.userId !== currentUser.uid;
  } catch (error) {
    console.error(error);
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (detailModal?.classList.contains('is-open')) syncOwnerState();
});

if (detailModal) {
  const observer = new MutationObserver(() => {
    if (detailModal.classList.contains('is-open')) syncOwnerState();
  });
  observer.observe(detailModal, { attributes: true, attributeFilter: ['class'] });
}

editButton?.addEventListener('click', async () => {
  await syncOwnerState();
  if (!activeData || !currentUser || activeData.userId !== currentUser.uid || !editForm) return;
  editForm.elements.category.value = activeData.category || '이용 문의';
  editForm.elements.title.value = activeData.title || '';
  editForm.elements.content.value = activeData.content || '';
  setStatus();
  closeModal(detailModal);
  openModal(editModal);
});

editForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeId || !activeData || !currentUser || activeData.userId !== currentUser.uid) return;
  const submit = editForm.querySelector('[type="submit"]');
  const data = new FormData(editForm);
  const category = String(data.get('category') || '이용 문의');
  const title = String(data.get('title') || '').trim();
  const content = String(data.get('content') || '').trim();
  if (title.length < 2 || content.length < 5) return setStatus('문의 제목과 내용을 조금 더 입력해 주세요.', true);

  submit.disabled = true;
  setStatus('문의를 수정하고 있습니다.');
  try {
    await updateDoc(doc(db, 'inquiries', activeId), {
      category,
      title,
      content,
      updatedAt: serverTimestamp()
    });
    setStatus('문의가 수정되었습니다.');
    window.setTimeout(() => {
      closeModal(editModal);
      window.location.href = `inquiry.html?id=${encodeURIComponent(activeId)}`;
    }, 450);
  } catch (error) {
    console.error(error);
    setStatus('문의 수정 권한 또는 Firestore Rules를 확인해 주세요.', true);
  } finally {
    submit.disabled = false;
  }
});

editModal?.querySelectorAll('[data-community-close]').forEach((button) => {
  button.addEventListener('click', () => closeModal(editModal));
});
editModal?.addEventListener('click', (event) => {
  if (event.target === editModal) closeModal(editModal);
});
