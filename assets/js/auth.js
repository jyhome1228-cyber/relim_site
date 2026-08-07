import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

let auth = null;

function getRelimAuth() {
  if (!firebaseReady) return null;
  if (!auth) {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.languageCode = 'ko';
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
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

function userInitial(user) {
  return (user.displayName || user.email || 'R').trim().charAt(0).toUpperCase();
}

export function initAuthNavigation(memberLink) {
  const relimAuth = getRelimAuth();
  if (!relimAuth) {
    memberLink.dataset.authState = 'setup';
    return;
  }

  onAuthStateChanged(relimAuth, (user) => {
    memberLink.replaceChildren();
    if (!user) {
      memberLink.href = `login.html?return=${encodeURIComponent(location.pathname.split('/').pop() || 'index.html')}`;
      memberLink.textContent = '로그인';
      memberLink.setAttribute('aria-label', '로그인 및 회원가입');
      memberLink.dataset.authState = 'signed-out';
      return;
    }

    const avatar = document.createElement('span');
    avatar.className = 'member-nav-avatar';
    avatar.textContent = userInitial(user);
    const label = document.createElement('span');
    label.textContent = user.displayName || '내 계정';
    memberLink.append(avatar, label);
    memberLink.href = 'login.html';
    memberLink.setAttribute('aria-label', `${user.displayName || '회원'} 계정`);
    memberLink.dataset.authState = 'signed-in';
  });
}

export function initLoginPage() {
  const page = document.querySelector('[data-auth-page]');
  if (!page) return;

  const googleButton = page.querySelector('[data-google-login]');
  const loginForm = page.querySelector('[data-login-form]');
  const signupForm = page.querySelector('[data-signup-form]');
  const resetButton = page.querySelector('[data-password-reset]');
  const logoutButton = page.querySelector('[data-logout]');
  const setup = page.querySelector('[data-auth-setup]');
  const guest = page.querySelector('[data-auth-guest]');
  const account = page.querySelector('[data-auth-account]');
  const status = page.querySelector('[data-auth-status]');
  const name = page.querySelector('[data-auth-name]');
  const email = page.querySelector('[data-auth-email]');
  const avatar = page.querySelector('[data-auth-avatar]');
  const relimAuth = getRelimAuth();

  const setStatus = (message = '', isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.hidden = !message;
  };

  const errorMessage = (error) => {
    const messages = {
      'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
      'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/invalid-email': '이메일 형식을 확인해 주세요.',
      'auth/too-many-requests': '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.',
      'auth/weak-password': '비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.',
      'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
      'auth/popup-closed-by-user': '로그인 창이 닫혔습니다. 다시 시도해 주세요.',
      'auth/unauthorized-domain': '현재 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.',
      'auth/operation-not-allowed': 'Firebase에서 해당 로그인 방식을 먼저 활성화해 주세요.'
    };
    return messages[error?.code] || '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  };

  if (!relimAuth) {
    setup.hidden = false;
    guest.hidden = true;
    account.hidden = true;
    return;
  }

  onAuthStateChanged(relimAuth, (user) => {
    setup.hidden = true;
    guest.hidden = Boolean(user);
    account.hidden = !user;
    setStatus();

    if (user) {
      name.textContent = user.displayName || '리림 회원';
      email.textContent = user.email || '';
      avatar.textContent = userInitial(user);
    }
  });

  googleButton?.addEventListener('click', async () => {
    googleButton.disabled = true;
    googleButton.classList.add('is-loading');
    setStatus('Google 계정을 확인하고 있습니다.');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(relimAuth, provider);
      window.location.href = safeReturnUrl();
    } catch (error) {
      setStatus(errorMessage(error), true);
    } finally {
      googleButton.disabled = false;
      googleButton.classList.remove('is-loading');
    }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    const data = new FormData(loginForm);
    submit.disabled = true;
    setStatus('로그인하고 있습니다.');
    try {
      await signInWithEmailAndPassword(relimAuth, String(data.get('email')).trim(), String(data.get('password')));
      window.location.href = safeReturnUrl();
    } catch (error) {
      setStatus(errorMessage(error), true);
    } finally {
      submit.disabled = false;
    }
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = signupForm.querySelector('[type="submit"]');
    const data = new FormData(signupForm);
    const nameValue = String(data.get('name')).trim();
    const emailValue = String(data.get('email')).trim();
    const password = String(data.get('password'));
    const passwordConfirm = String(data.get('passwordConfirm'));

    if (nameValue.length < 2) return setStatus('이름을 2자 이상 입력해 주세요.', true);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return setStatus('비밀번호는 영문과 숫자를 포함해 8자 이상 입력해 주세요.', true);
    }
    if (password !== passwordConfirm) return setStatus('비밀번호가 서로 일치하지 않습니다.', true);
    if (!data.get('terms') || !data.get('privacy')) return setStatus('필수 약관에 동의해 주세요.', true);

    submit.disabled = true;
    setStatus('회원가입을 진행하고 있습니다.');
    try {
      const credential = await createUserWithEmailAndPassword(relimAuth, emailValue, password);
      await updateProfile(credential.user, { displayName: nameValue });
      window.location.href = safeReturnUrl();
    } catch (error) {
      setStatus(errorMessage(error), true);
    } finally {
      submit.disabled = false;
    }
  });

  resetButton?.addEventListener('click', async () => {
    const emailInput = loginForm?.querySelector('[name="email"]');
    const emailValue = emailInput?.value.trim();
    if (!emailValue) {
      emailInput?.focus();
      setStatus('비밀번호 재설정 링크를 받을 이메일을 먼저 입력해 주세요.', true);
      return;
    }
    resetButton.disabled = true;
    try {
      await sendPasswordResetEmail(relimAuth, emailValue);
      setStatus('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.');
    } catch (error) {
      setStatus(errorMessage(error), true);
    } finally {
      resetButton.disabled = false;
    }
  });

  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await signOut(relimAuth);
    } finally {
      logoutButton.disabled = false;
    }
  });
}

export function requireAuth(returnUrl = window.location.href) {
  const relimAuth = getRelimAuth();
  if (!relimAuth) {
    window.location.href = 'login.html';
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const stop = onAuthStateChanged(relimAuth, (user) => {
      stop();
      if (!user) {
        window.location.href = `login.html?return=${encodeURIComponent(returnUrl)}`;
        return;
      }
      resolve(user);
    });
  });
}

initLoginPage();
