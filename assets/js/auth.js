import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
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
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const CONSENT_VERSION = '2026-08-10';
let auth = null;
let db = null;

function getRelimAuth() {
  if (!firebaseReady) return null;
  if (!auth) {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    auth.languageCode = 'ko';
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
}

async function syncMemberProfile(user) {
  if (!user || !db) return;
  const provider = user.providerData?.[0]?.providerId || 'password';
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: user.displayName || '리림 회원',
      email: user.email || '',
      provider,
      createdAt: user.metadata?.creationTime || '',
      lastLoginAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('[RE:LIM MEMBER PROFILE]', error);
  }
}

async function recordMemberConsent(user, source = 'email') {
  if (!user || !db) return;
  try {
    await setDoc(doc(db, 'users', user.uid), {
      agreements: {
        age14: true,
        terms: true,
        privacy: true,
        termsVersion: CONSENT_VERSION,
        privacyVersion: CONSENT_VERSION,
        source,
        agreedAt: serverTimestamp()
      }
    }, { merge: true });
  } catch (error) {
    console.error('[RE:LIM MEMBER CONSENT]', error);
    throw error;
  }
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

function ensureCommunityNavigation() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const links = [
    ['reviews.html', '리뷰'],
    ['inquiry.html', '문의하기']
  ];

  links.forEach(([href, label]) => {
    if (nav.querySelector(`a[href="${href}"]`)) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    nav.append(link);
  });

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a').forEach((link) => {
    if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  });

  if (!document.getElementById('relim-member-header-fix')) {
    const style = document.createElement('style');
    style.id = 'relim-member-header-fix';
    style.textContent = `
      .header-inner{gap:18px}
      .brand-logo{flex:0 0 auto}
      .nav{flex:1 1 auto;min-width:0;justify-content:center;gap:clamp(12px,1.45vw,24px)}
      .nav a{flex:0 0 auto;white-space:nowrap;font-size:14px}
      .member-nav-link.header-book{margin-left:0;flex:0 0 auto}
      .header-book{flex:0 0 auto}
      @media(max-width:1180px) and (min-width:901px){
        .nav{gap:11px}
        .nav a{font-size:12px;letter-spacing:-.035em}
        .header-book,.member-nav-link.header-book{padding-left:12px;padding-right:12px;font-size:12px}
        .brand-logo{width:118px}
      }
      @media(max-width:900px){
        .header-inner{gap:10px}
        .nav{justify-content:flex-start;gap:0}
        .nav a{font-size:16px}
        .member-nav-link.header-book{margin-left:auto}
      }
    `;
    document.head.append(style);
  }
}

export function initAuthNavigation(memberLink) {
  ensureCommunityNavigation();
  const relimAuth = getRelimAuth();
  if (!relimAuth) {
    memberLink.dataset.authState = 'setup';
    return;
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isAuthPage = currentPage === 'login.html' || currentPage === 'signup.html';

  onAuthStateChanged(relimAuth, (user) => {
    memberLink.replaceChildren();
    if (!user) {
      memberLink.href = `login.html?return=${encodeURIComponent(location.pathname.split('/').pop() || 'index.html')}`;
      memberLink.textContent = '로그인';
      memberLink.setAttribute('aria-label', '로그인 및 회원가입');
      memberLink.dataset.authState = 'signed-out';
      return;
    }

    if (!isAuthPage) syncMemberProfile(user);
    memberLink.textContent = '마이페이지';
    memberLink.href = 'mypage.html';
    memberLink.setAttribute('aria-label', '마이페이지');
    memberLink.dataset.authState = 'signed-in';
  });
}

export function initLoginPage() {
  const page = document.querySelector('[data-auth-page]');
  if (!page) return;

  const signupMode = page.dataset.authMode === 'signup';
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
  const allAgreement = page.querySelector('[data-agree-all]');
  const requiredAgreements = [...page.querySelectorAll('[data-required-agreement]')];
  const relimAuth = getRelimAuth();

  const setStatus = (message = '', isError = false) => {
    if (!status) return;
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

  const agreementsReady = () => !signupMode || requiredAgreements.every((input) => input.checked);

  const updateAgreementAllState = () => {
    if (!allAgreement || !requiredAgreements.length) return;
    const checkedCount = requiredAgreements.filter((input) => input.checked).length;
    allAgreement.checked = checkedCount === requiredAgreements.length;
    allAgreement.indeterminate = checkedCount > 0 && checkedCount < requiredAgreements.length;
  };

  allAgreement?.addEventListener('change', () => {
    requiredAgreements.forEach((input) => { input.checked = allAgreement.checked; });
    allAgreement.indeterminate = false;
  });
  requiredAgreements.forEach((input) => input.addEventListener('change', updateAgreementAllState));
  updateAgreementAllState();

  if (!relimAuth) {
    if (setup) setup.hidden = false;
    if (guest) guest.hidden = true;
    if (account) account.hidden = true;
    return;
  }

  onAuthStateChanged(relimAuth, (user) => {
    if (setup) setup.hidden = true;
    if (guest) guest.hidden = Boolean(user);
    if (account) account.hidden = !user;
    setStatus();

    if (user) {
      if (name) name.textContent = user.displayName || '리림 회원';
      if (email) email.textContent = user.email || '';
      if (avatar) avatar.textContent = userInitial(user);
    }
  });

  googleButton?.addEventListener('click', async () => {
    if (signupMode && !agreementsReady()) {
      setStatus('만 14세 이상 확인, 이용약관 및 개인정보 수집·이용에 모두 동의해 주세요.', true);
      return;
    }

    googleButton.disabled = true;
    googleButton.classList.add('is-loading');
    setStatus('Google 계정을 확인하고 있습니다.');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(relimAuth, provider);
      const additionalInfo = getAdditionalUserInfo(credential);

      if (!signupMode && additionalInfo?.isNewUser) {
        await deleteUser(credential.user);
        setStatus('처음 Google로 가입하는 경우 회원가입 페이지에서 약관 동의 후 진행해 주세요.', true);
        window.setTimeout(() => { window.location.href = 'signup.html'; }, 1200);
        return;
      }

      await syncMemberProfile(credential.user);
      if (signupMode) await recordMemberConsent(credential.user, 'google');
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
      const credential = await signInWithEmailAndPassword(relimAuth, String(data.get('email')).trim(), String(data.get('password')));
      await syncMemberProfile(credential.user);
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
    if (!data.get('age14') || !data.get('terms') || !data.get('privacy')) {
      return setStatus('만 14세 이상 확인, 이용약관 및 개인정보 수집·이용에 모두 동의해 주세요.', true);
    }

    submit.disabled = true;
    setStatus('회원가입을 진행하고 있습니다.');
    try {
      const credential = await createUserWithEmailAndPassword(relimAuth, emailValue, password);
      await updateProfile(credential.user, { displayName: nameValue });
      await syncMemberProfile(credential.user);
      await recordMemberConsent(credential.user, 'email');
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
      syncMemberProfile(user);
      resolve(user);
    });
  });
}

initLoginPage();
