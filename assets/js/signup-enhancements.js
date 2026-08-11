import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const page = document.querySelector('[data-auth-page][data-auth-mode="signup"]');
const form = page?.querySelector('[data-signup-form]');
const googleButton = page?.querySelector('[data-google-login]');
const status = page?.querySelector('[data-auth-status]');
const passwordInput = form?.querySelector('[name="password"]');
const passwordConfirmInput = form?.querySelector('[name="passwordConfirm"]');
const passwordMatch = page?.querySelector('[data-password-match]');
const phoneInput = form?.querySelector('[name="phone"]');

function setStatus(message = '', isError = false) {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
  status.hidden = !message;
}

function safeReturnUrl() {
  const requested = new URLSearchParams(window.location.search).get('return');
  if (!requested) return 'index.html';
  try {
    const target = new URL(requested, window.location.href);
    return target.origin === window.location.origin
      ? `${target.pathname.split('/').pop() || 'index.html'}${target.search}${target.hash}`
      : 'index.html';
  } catch {
    return 'index.html';
  }
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^01(?:0|1|[6-9])\d{7,8}$/.test(digits);
}

function updatePasswordMatch() {
  if (!passwordInput || !passwordConfirmInput || !passwordMatch) return true;
  const password = passwordInput.value;
  const confirm = passwordConfirmInput.value;

  passwordMatch.classList.remove('is-match', 'is-mismatch');
  if (!confirm) {
    passwordMatch.textContent = '같은 비밀번호를 한 번 더 입력해 주세요.';
    passwordConfirmInput.setCustomValidity('');
    return false;
  }

  if (password === confirm) {
    passwordMatch.textContent = '비밀번호가 일치합니다.';
    passwordMatch.classList.add('is-match');
    passwordConfirmInput.setCustomValidity('');
    return true;
  }

  passwordMatch.textContent = '비밀번호가 일치하지 않습니다.';
  passwordMatch.classList.add('is-mismatch');
  passwordConfirmInput.setCustomValidity('비밀번호가 일치하지 않습니다.');
  return false;
}

function collectProfile() {
  const data = new FormData(form);
  return {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    phone: formatPhone(data.get('phone')),
    address: String(data.get('address') || '').trim(),
    signupSource: String(data.get('signupSource') || '').trim(),
    password: String(data.get('password') || ''),
    passwordConfirm: String(data.get('passwordConfirm') || '')
  };
}

function agreementsReady() {
  return [...page.querySelectorAll('[data-required-agreement]')].every((input) => input.checked);
}

function validateCommon(profile) {
  if (profile.name.length < 2) {
    form.querySelector('[name="name"]')?.focus();
    setStatus('이름을 2자 이상 입력해 주세요.', true);
    return false;
  }
  if (!isValidPhone(profile.phone)) {
    phoneInput?.focus();
    setStatus('휴대폰 번호를 정확히 입력해 주세요.', true);
    return false;
  }
  if (profile.address.length < 5) {
    form.querySelector('[name="address"]')?.focus();
    setStatus('주소를 입력해 주세요.', true);
    return false;
  }
  if (!profile.signupSource) {
    form.querySelector('[name="signupSource"]')?.focus();
    setStatus('리림을 알게 된 경로를 선택해 주세요.', true);
    return false;
  }
  if (!agreementsReady()) {
    setStatus('만 14세 이상 확인, 이용약관 및 개인정보 수집·이용에 모두 동의해 주세요.', true);
    return false;
  }
  return true;
}

function validateEmailSignup(profile) {
  if (!validateCommon(profile)) return false;
  if (!profile.email || !form.querySelector('[name="email"]')?.checkValidity()) {
    form.querySelector('[name="email"]')?.focus();
    setStatus('사용할 이메일 주소를 정확히 입력해 주세요.', true);
    return false;
  }
  if (profile.password.length < 8 || !/[A-Za-z]/.test(profile.password) || !/[0-9]/.test(profile.password)) {
    passwordInput?.focus();
    setStatus('비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.', true);
    return false;
  }
  if (profile.password !== profile.passwordConfirm) {
    updatePasswordMatch();
    passwordConfirmInput?.focus();
    setStatus('비밀번호 두 칸이 서로 일치하지 않습니다.', true);
    return false;
  }
  return true;
}

function errorMessage(error) {
  const messages = {
    'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
    'auth/invalid-email': '이메일 형식을 확인해 주세요.',
    'auth/weak-password': '비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
    'auth/popup-closed-by-user': 'Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.',
    'auth/unauthorized-domain': '현재 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.',
    'auth/operation-not-allowed': 'Firebase에서 해당 로그인 방식을 먼저 활성화해 주세요.'
  };
  return messages[error?.code] || '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

async function saveRegistration(db, user, profile, provider) {
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name: profile.name || user.displayName || '리림 회원',
    email: user.email || profile.email || '',
    phone: profile.phone,
    address: profile.address,
    signupSource: profile.signupSource,
    provider,
    createdAt: user.metadata?.creationTime || '',
    registeredAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    agreements: {
      age14: true,
      terms: true,
      privacy: true,
      termsVersion: '2026-08-11',
      privacyVersion: '2026-08-11',
      source: provider,
      agreedAt: serverTimestamp()
    }
  }, { merge: true });
}

async function getServices() {
  if (!firebaseReady) throw new Error('firebase-not-ready');
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const auth = getAuth(app);
  auth.languageCode = 'ko';
  await setPersistence(auth, browserLocalPersistence).catch(() => {});
  return { auth, db: getFirestore(app) };
}

if (page && form) {
  phoneInput?.addEventListener('input', () => {
    const start = phoneInput.selectionStart;
    const before = phoneInput.value;
    phoneInput.value = formatPhone(phoneInput.value);
    if (document.activeElement === phoneInput && start === before.length) {
      phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
    }
  });

  passwordInput?.addEventListener('input', updatePasswordMatch);
  passwordConfirmInput?.addEventListener('input', updatePasswordMatch);
  updatePasswordMatch();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const profile = collectProfile();
    if (!validateEmailSignup(profile)) return;

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    setStatus('회원가입을 진행하고 있습니다.');

    try {
      const { auth, db } = await getServices();
      const credential = await createUserWithEmailAndPassword(auth, profile.email, profile.password);
      await updateProfile(credential.user, { displayName: profile.name });
      await saveRegistration(db, credential.user, profile, 'email');
      setStatus('회원가입이 완료되었습니다.');
      window.location.href = safeReturnUrl();
    } catch (error) {
      console.error('[RE:LIM SIGNUP]', error);
      setStatus(error.message === 'firebase-not-ready' ? '회원가입 설정을 확인해 주세요.' : errorMessage(error), true);
      submit.disabled = false;
    }
  }, true);

  googleButton?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const profile = collectProfile();
    if (!validateCommon(profile)) return;

    googleButton.disabled = true;
    setStatus('Google 계정을 확인하고 있습니다.');

    try {
      const { auth, db } = await getServices();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      if (profile.name && credential.user.displayName !== profile.name) {
        await updateProfile(credential.user, { displayName: profile.name });
      }
      await saveRegistration(db, credential.user, profile, 'google');
      setStatus('Google 계정으로 가입되었습니다.');
      window.location.href = safeReturnUrl();
    } catch (error) {
      console.error('[RE:LIM GOOGLE SIGNUP]', error);
      setStatus(error.message === 'firebase-not-ready' ? '회원가입 설정을 확인해 주세요.' : errorMessage(error), true);
      googleButton.disabled = false;
    }
  }, true);
}
