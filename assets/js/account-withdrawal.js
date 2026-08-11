import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  deleteUser,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const root = document.querySelector('[data-mypage]');
if (!root || !firebaseReady) {
  // Nothing to initialize on pages without mypage or Firebase.
} else {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let currentUser = null;

  const accountArea = root.querySelector('[data-mypage-account]');
  if (accountArea && !accountArea.querySelector('[data-account-management]')) {
    const section = document.createElement('section');
    section.className = 'mypage-account-management';
    section.dataset.accountManagement = '';
    section.innerHTML = `
      <div class="mypage-account-management-head">
        <div>
          <p class="eyebrow">ACCOUNT</p>
          <h2>계정 관리</h2>
          <p>리림 회원 서비스를 더 이상 이용하지 않는 경우 회원탈퇴를 진행할 수 있습니다. 탈퇴 전 삭제되는 정보를 반드시 확인해 주세요.</p>
        </div>
        <button class="mypage-withdraw-open" type="button" data-withdraw-open>회원탈퇴</button>
      </div>
    `;
    accountArea.append(section);
  }

  if (!document.getElementById('relimWithdrawModal')) {
    const modal = document.createElement('div');
    modal.className = 'community-modal withdraw-modal';
    modal.id = 'relimWithdrawModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'withdrawTitle');
    modal.innerHTML = `
      <div class="community-modal-panel">
        <button class="community-modal-close" type="button" data-withdraw-close aria-label="닫기">×</button>
        <p class="eyebrow">DELETE ACCOUNT</p>
        <h2 id="withdrawTitle">회원탈퇴</h2>
        <p class="withdraw-intro">본인 확인 후 계정과 회원정보를 삭제합니다. 탈퇴가 완료되면 되돌릴 수 없습니다.</p>

        <div class="withdraw-summary" aria-label="삭제 예정 정보">
          <div><span>회원정보</span><strong>전체 삭제</strong></div>
          <div><span>내 문의</span><strong data-withdraw-inquiries>-</strong></div>
          <div><span>내 리뷰</span><strong data-withdraw-reviews>-</strong></div>
        </div>

        <div class="withdraw-notice">
          <strong>탈퇴 전 확인해 주세요.</strong>
          <ul>
            <li>회원 프로필과 로그인 계정이 삭제됩니다.</li>
            <li>내가 작성한 문의와 문의 비공개 본문이 함께 삭제됩니다.</li>
            <li>내가 작성한 리뷰도 함께 삭제되며 복구할 수 없습니다.</li>
          </ul>
        </div>

        <form data-withdraw-form>
          <div class="withdraw-reauth" data-password-reauth hidden>
            <label>현재 비밀번호
              <input type="password" name="password" autocomplete="current-password" placeholder="현재 비밀번호를 입력해 주세요">
            </label>
            <p class="withdraw-provider-note">안전한 탈퇴 처리를 위해 현재 비밀번호로 본인 확인을 진행합니다.</p>
          </div>

          <div class="withdraw-reauth" data-google-reauth hidden>
            <p class="withdraw-provider-note">탈퇴 버튼을 누르면 Google 계정 선택 창이 열리고 본인 확인 후 탈퇴가 진행됩니다.</p>
          </div>

          <label class="withdraw-confirm">
            <input type="checkbox" name="confirm" required>
            <span>회원정보와 내가 작성한 문의·리뷰가 함께 삭제되며 복구할 수 없음을 확인했습니다.</span>
          </label>

          <p class="withdraw-status" data-withdraw-status role="status" hidden></p>
          <div class="withdraw-actions">
            <button class="withdraw-cancel" type="button" data-withdraw-close>취소</button>
            <button class="withdraw-submit" type="submit" data-withdraw-submit>본인 확인 후 회원탈퇴</button>
          </div>
        </form>
      </div>
    `;
    document.body.append(modal);
  }

  const modal = document.getElementById('relimWithdrawModal');
  const openButton = root.querySelector('[data-withdraw-open]');
  const form = modal?.querySelector('[data-withdraw-form]');
  const passwordArea = modal?.querySelector('[data-password-reauth]');
  const googleArea = modal?.querySelector('[data-google-reauth]');
  const passwordInput = form?.querySelector('[name="password"]');
  const submitButton = modal?.querySelector('[data-withdraw-submit]');
  const status = modal?.querySelector('[data-withdraw-status]');
  const inquiryCount = modal?.querySelector('[data-withdraw-inquiries]');
  const reviewCount = modal?.querySelector('[data-withdraw-reviews]');

  const setStatus = (message = '', isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.hidden = !message;
  };

  const providerType = () => {
    const ids = currentUser?.providerData?.map((provider) => provider.providerId) || [];
    if (ids.includes('password')) return 'password';
    if (ids.includes('google.com')) return 'google';
    return ids[0] || 'unknown';
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    form?.reset();
    setStatus();
    openButton?.focus();
  };

  const refreshDeletePreview = async () => {
    if (!currentUser) return;
    if (inquiryCount) inquiryCount.textContent = '확인 중';
    if (reviewCount) reviewCount.textContent = '확인 중';
    try {
      const [questions, reviews] = await Promise.all([
        getDocs(query(collection(db, 'questions'), where('ownerUid', '==', currentUser.uid))),
        getDocs(query(collection(db, 'reviews'), where('userId', '==', currentUser.uid)))
      ]);
      if (inquiryCount) inquiryCount.textContent = `${questions.size}개`;
      if (reviewCount) reviewCount.textContent = `${reviews.size}개`;
    } catch (error) {
      console.warn('[RE:LIM WITHDRAW PREVIEW]', error);
      if (inquiryCount) inquiryCount.textContent = '삭제 대상';
      if (reviewCount) reviewCount.textContent = '삭제 대상';
    }
  };

  const openModal = async () => {
    if (!modal || !currentUser) return;
    const type = providerType();
    if (passwordArea) passwordArea.hidden = type !== 'password';
    if (googleArea) googleArea.hidden = type !== 'google';
    if (submitButton) {
      submitButton.textContent = type === 'google'
        ? 'Google 본인 확인 후 탈퇴'
        : '비밀번호 확인 후 탈퇴';
    }
    setStatus();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    await refreshDeletePreview();
    if (type === 'password') passwordInput?.focus();
    else form?.querySelector('[name="confirm"]')?.focus();
  };

  const reauthenticate = async () => {
    if (!currentUser) throw new Error('auth/no-current-user');
    const type = providerType();
    if (type === 'password') {
      const password = String(passwordInput?.value || '');
      if (!password) throw new Error('withdraw/password-required');
      if (!currentUser.email) throw new Error('withdraw/email-missing');
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      return;
    }
    if (type === 'google') {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await reauthenticateWithPopup(currentUser, provider);
      return;
    }
    throw new Error('withdraw/provider-unsupported');
  };

  const deleteMemberData = async (uid) => {
    const [questions, reviews] = await Promise.all([
      getDocs(query(collection(db, 'questions'), where('ownerUid', '==', uid))),
      getDocs(query(collection(db, 'reviews'), where('userId', '==', uid)))
    ]);

    for (const question of questions.docs) {
      await deleteDoc(doc(db, 'questions', question.id, 'private', 'body'));
      await deleteDoc(doc(db, 'questions', question.id));
    }

    for (const review of reviews.docs) {
      await deleteDoc(doc(db, 'reviews', review.id));
    }

    await deleteDoc(doc(db, 'users', uid));
  };

  const errorMessage = (error) => {
    const code = error?.code || error?.message || '';
    const messages = {
      'withdraw/password-required': '현재 비밀번호를 입력해 주세요.',
      'withdraw/email-missing': '이메일 계정 정보를 확인할 수 없습니다. 다시 로그인한 후 시도해 주세요.',
      'withdraw/provider-unsupported': '현재 로그인 방식에서는 자동 탈퇴를 진행할 수 없습니다. 고객센터로 문의해 주세요.',
      'auth/wrong-password': '현재 비밀번호가 올바르지 않습니다.',
      'auth/invalid-credential': '현재 비밀번호가 올바르지 않거나 본인 확인에 실패했습니다.',
      'auth/popup-closed-by-user': 'Google 본인 확인 창이 닫혔습니다. 다시 시도해 주세요.',
      'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 회원탈퇴를 진행해 주세요.',
      'auth/network-request-failed': '네트워크 연결을 확인한 후 다시 시도해 주세요.',
      'permission-denied': '회원정보 삭제 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    };
    return messages[code] || '회원탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
  };

  openButton?.addEventListener('click', openModal);
  modal?.querySelectorAll('[data-withdraw-close]').forEach((button) => button.addEventListener('click', closeModal));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeModal();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser || !submitButton) return;
    const confirmed = form.querySelector('[name="confirm"]')?.checked;
    if (!confirmed) {
      setStatus('삭제 안내를 확인하고 체크해 주세요.', true);
      return;
    }

    submitButton.disabled = true;
    setStatus('본인 확인을 진행하고 있습니다.');
    try {
      await reauthenticate();
      const userToDelete = currentUser;
      setStatus('회원정보와 작성한 내용을 삭제하고 있습니다.');
      await deleteMemberData(userToDelete.uid);
      setStatus('로그인 계정을 삭제하고 있습니다.');
      await deleteUser(userToDelete);
      sessionStorage.setItem('relim-withdrawn', 'true');
      window.location.href = 'login.html?withdrawn=1';
    } catch (error) {
      console.error('[RE:LIM WITHDRAW]', error);
      setStatus(errorMessage(error), true);
      submitButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user && modal?.classList.contains('is-open')) closeModal();
  });
}
