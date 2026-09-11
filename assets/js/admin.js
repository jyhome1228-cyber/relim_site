import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com', 'penury@naver.com']);
const CONFIG_COLLECTION = 'siteConfig';
const CONFIG_DOCUMENT = 'public';

const DEFAULT_CONFIG = {
  version: 2,
  home: {
    eyebrow: 'RE:LIM IN YONGIN',
    title: '다시, 숲으로',
    description: '자연 속에서 머무르고 쉬는 공간 RE:LIM',
    reservationLabel: '예약하기',
    aboutLabel: '리림 알아보기',
    heroImageUrl: ''
  },
  operation: {
    facilityName: '리림',
    phone: '010-5794-8823',
    address: '경기도 용인시 처인구 원삼면 보개원삼로1372번길 45',
    email: 'penury@naver.com',
    holidayNote: '',
    morningHours: '10:00 ~ 15:00',
    afternoonHours: '16:00 ~ 21:00',
    maxPeople: '10인',
    basePrice: '25,000원',
    shelterPrice: '150,000원',
    extraPrice: '',
    reservationUrl: 'https://camfit.co.kr/camp/6a6b276b521182001db33430?keyword=%EB%A6%AC%EB%A6%BC&adultCnt=2',
    reservationStatus: 'open',
    reservationButtonLabel: '예약하기',
    reservationNote: ''
  },
  announcement: {
    enabled: true,
    title: 'WELCOME TO RE:LIM',
    text: '리림 예약이 오픈되었습니다. 원하는 날짜와 시간을 확인해 보세요.',
    button: '예약하러 가기',
    url: 'https://camfit.co.kr/camp/6a6b276b521182001db33430?keyword=%EB%A6%AC%EB%A6%BC&adultCnt=2',
    startDate: '',
    endDate: ''
  },
  notices: [],
  faqs: [],
  seo: {
    title: '리림 RE:LIM | 용인 캠핑장·수영장·유수풀·당일 글램핑',
    description: '용인 원삼면 리림 RE:LIM. 야외 수영장·유수풀·개별 쉘터·바베큐를 오전·오후 타임제로 즐기는 가족 캠프닉·당일 글램핑 공간입니다.',
    keywords: '리림, RE:LIM, 용인 캠핑장, 용인 캠프닉, 용인 수영장',
    ogImage: 'https://re-lim.com/assets/images/og-relim.png'
  },
  links: {
    instagram: 'https://www.instagram.com/relimofficial/',
    naverMap: 'https://map.naver.com/p/entry/place/30821021'
  },
  business: {
    company: '(주)나인힐스',
    representative: '남현승',
    businessNumber: '220-86-50466',
    tourismNumber: '제2015-000014호',
    address: '경기 용인시 처인구 원삼면 보개원삼로1372번길 41 나인힐스',
    email: 'penury@naver.com'
  }
};

const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

const state = {
  config: structuredClone(DEFAULT_CONFIG),
  questions: [],
  members: [],
  activeQuestion: null,
  questionBody: null,
  unsubscribers: []
};

const loading = document.querySelector('[data-admin-loading]');
const denied = document.querySelector('[data-admin-denied]');
const dashboardRoot = document.querySelector('[data-admin-dashboard]');
const session = document.querySelector('[data-admin-session]');
const toast = document.querySelector('[data-admin-toast]');
const pageTitle = document.querySelector('[data-page-title]');
const pageDescription = document.querySelector('[data-page-description]');

const TAB_META = {
  dashboard: ['Dashboard', '오늘의 리림 운영 현황과 사이트 상태를 확인합니다.'],
  homepage: ['홈페이지 관리', '메인 문구와 대표 이미지처럼 자주 바뀌는 콘텐츠를 직접 수정합니다.'],
  operation: ['운영정보', '운영시간, 이용요금, 연락처와 예약 정보를 관리합니다.'],
  content: ['콘텐츠', '공지사항, 팝업과 FAQ를 등록하고 노출 상태를 관리합니다.'],
  customer: ['고객관리', '홈페이지 문의와 가입 회원을 확인합니다.'],
  settings: ['사이트 설정', '검색 메타정보, SNS 링크와 사업자 정보를 관리합니다.']
};

function isAdmin(user) {
  return ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());
}

function deepMerge(base, incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return base;
  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      base[key] = value;
      return;
    }
    if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
      base[key] = deepMerge(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
      return;
    }
    base[key] = value;
  });
  return base;
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function uid(prefix = 'item') {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value, withTime = false) {
  const date = toDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' }
  ).format(date);
}

function showToast(message, isError = false) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function setInlineStatus(element, message = '', isError = false) {
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
  if (!document.querySelector('.admin-modal.is-open')) document.body.style.overflow = '';
}

function makeCell(text = '', className = '') {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function showTab(name) {
  document.querySelectorAll('[data-admin-view]').forEach((view) => {
    view.classList.toggle('is-active', view.dataset.adminView === name);
  });
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.adminTab === name);
  });
  const meta = TAB_META[name] || TAB_META.dashboard;
  if (pageTitle) pageTitle.textContent = meta[0];
  if (pageDescription) pageDescription.textContent = meta[1];
  document.body.classList.remove('admin-menu-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindNavigation() {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => showTab(button.dataset.adminTab));
  });
  document.querySelectorAll('[data-admin-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.adminJump;
      showTab(tab);
      if (tab === 'content' && button.dataset.contentFocus) {
        showSubtab('content', button.dataset.contentFocus);
      }
    });
  });
  document.querySelector('[data-admin-menu]')?.addEventListener('click', () => {
    document.body.classList.toggle('admin-menu-open');
  });
}

function showSubtab(group, name) {
  const buttonSelector = group === 'content' ? '[data-content-tab]' : '[data-customer-tab]';
  const viewSelector = group === 'content' ? '[data-content-view]' : '[data-customer-view]';
  const key = group === 'content' ? 'contentTab' : 'customerTab';
  const viewKey = group === 'content' ? 'contentView' : 'customerView';
  document.querySelectorAll(buttonSelector).forEach((button) => {
    button.classList.toggle('is-active', button.dataset[key] === name);
  });
  document.querySelectorAll(viewSelector).forEach((view) => {
    view.classList.toggle('is-active', view.dataset[viewKey] === name);
  });
}

function bindSubtabs() {
  document.querySelectorAll('[data-content-tab]').forEach((button) => {
    button.addEventListener('click', () => showSubtab('content', button.dataset.contentTab));
  });
  document.querySelectorAll('[data-customer-tab]').forEach((button) => {
    button.addEventListener('click', () => showSubtab('customer', button.dataset.customerTab));
  });
}

async function loadConfig() {
  if (!db) return;
  try {
    const snapshot = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT));
    if (snapshot.exists()) state.config = deepMerge(structuredClone(DEFAULT_CONFIG), snapshot.data());
    else state.config = structuredClone(DEFAULT_CONFIG);
  } catch (error) {
    console.error('[RE:LIM ADMIN CONFIG LOAD]', error);
    state.config = structuredClone(DEFAULT_CONFIG);
    showToast('사이트 설정을 불러오지 못해 기본값을 표시합니다.', true);
  }
  fillForms();
  renderNotices();
  renderFaqs();
  renderDashboardStats();
}

async function persistConfig(successMessage = '저장되었습니다.') {
  if (!db || !auth?.currentUser || !isAdmin(auth.currentUser)) throw new Error('관리자 권한이 없습니다.');
  state.config.updatedAt = Timestamp.now();
  state.config.updatedBy = auth.currentUser.email || '';
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOCUMENT), state.config);
  showToast(successMessage);
  renderDashboardStats();
}

function setFormValue(form, name, value) {
  const field = form?.elements?.[name];
  if (!field) return;
  if (field.type === 'checkbox') field.checked = Boolean(value);
  else field.value = value ?? '';
}

function fillForms() {
  const homeForm = document.querySelector('[data-form="homepage"]');
  const operationForm = document.querySelector('[data-form="operation"]');
  const popupForm = document.querySelector('[data-form="popup"]');
  const settingsForm = document.querySelector('[data-form="settings"]');
  const { home, operation, announcement, seo, links, business } = state.config;

  setFormValue(homeForm, 'homeEyebrow', home.eyebrow);
  setFormValue(homeForm, 'homeTitle', home.title);
  setFormValue(homeForm, 'homeDescription', home.description);
  setFormValue(homeForm, 'reservationLabel', home.reservationLabel);
  setFormValue(homeForm, 'aboutLabel', home.aboutLabel);
  setFormValue(homeForm, 'heroImageUrl', home.heroImageUrl);

  setFormValue(operationForm, 'facilityName', operation.facilityName);
  setFormValue(operationForm, 'phone', operation.phone);
  setFormValue(operationForm, 'address', operation.address);
  setFormValue(operationForm, 'email', operation.email);
  setFormValue(operationForm, 'holidayNote', operation.holidayNote);
  setFormValue(operationForm, 'morningHours', operation.morningHours);
  setFormValue(operationForm, 'afternoonHours', operation.afternoonHours);
  setFormValue(operationForm, 'maxPeople', operation.maxPeople);
  setFormValue(operationForm, 'basePrice', operation.basePrice);
  setFormValue(operationForm, 'shelterPrice', operation.shelterPrice);
  setFormValue(operationForm, 'extraPrice', operation.extraPrice);
  setFormValue(operationForm, 'reservationUrl', operation.reservationUrl);
  setFormValue(operationForm, 'reservationStatus', operation.reservationStatus);
  setFormValue(operationForm, 'reservationButtonLabel', operation.reservationButtonLabel);
  setFormValue(operationForm, 'reservationNote', operation.reservationNote);

  setFormValue(popupForm, 'announcementEnabled', announcement.enabled);
  setFormValue(popupForm, 'announcementTitle', announcement.title);
  setFormValue(popupForm, 'announcementText', announcement.text);
  setFormValue(popupForm, 'announcementButton', announcement.button);
  setFormValue(popupForm, 'announcementUrl', announcement.url);
  setFormValue(popupForm, 'announcementStart', announcement.startDate);
  setFormValue(popupForm, 'announcementEnd', announcement.endDate);

  setFormValue(settingsForm, 'seoTitle', seo.title);
  setFormValue(settingsForm, 'seoDescription', seo.description);
  setFormValue(settingsForm, 'seoKeywords', seo.keywords);
  setFormValue(settingsForm, 'ogImage', seo.ogImage);
  setFormValue(settingsForm, 'instagramUrl', links.instagram);
  setFormValue(settingsForm, 'naverMapUrl', links.naverMap);
  setFormValue(settingsForm, 'company', business.company);
  setFormValue(settingsForm, 'representative', business.representative);
  setFormValue(settingsForm, 'businessNumber', business.businessNumber);
  setFormValue(settingsForm, 'tourismNumber', business.tourismNumber);
  setFormValue(settingsForm, 'businessAddress', business.address);
  setFormValue(settingsForm, 'businessEmail', business.email);

  renderHeroPreview();
}

function renderHeroPreview() {
  const preview = document.querySelector('[data-preview="hero"]');
  if (!preview) return;
  preview.replaceChildren();
  const url = cleanString(state.config.home.heroImageUrl);
  if (!url) {
    const span = document.createElement('span');
    span.textContent = '등록된 이미지가 없습니다.';
    preview.append(span);
    return;
  }
  const image = document.createElement('img');
  image.src = url;
  image.alt = '메인 대표 이미지 미리보기';
  image.addEventListener('error', () => {
    preview.replaceChildren();
    const span = document.createElement('span');
    span.textContent = '이미지를 불러오지 못했습니다.';
    preview.append(span);
  });
  preview.append(image);
}

function bindForms() {
  document.querySelector('[data-form="homepage"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.home = {
      ...state.config.home,
      eyebrow: cleanString(data.get('homeEyebrow')),
      title: cleanString(data.get('homeTitle')),
      description: cleanString(data.get('homeDescription')),
      reservationLabel: cleanString(data.get('reservationLabel')),
      aboutLabel: cleanString(data.get('aboutLabel')),
      heroImageUrl: cleanString(data.get('heroImageUrl'))
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await persistConfig('홈페이지 콘텐츠를 저장했습니다.');
      renderHeroPreview();
    } catch (error) {
      console.error(error);
      showToast('홈페이지 저장에 실패했습니다. Firebase 권한을 확인해 주세요.', true);
    } finally { button.disabled = false; }
  });

  document.querySelector('[data-form="operation"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.operation = {
      ...state.config.operation,
      facilityName: cleanString(data.get('facilityName')),
      phone: cleanString(data.get('phone')),
      address: cleanString(data.get('address')),
      email: cleanString(data.get('email')),
      holidayNote: cleanString(data.get('holidayNote')),
      morningHours: cleanString(data.get('morningHours')),
      afternoonHours: cleanString(data.get('afternoonHours')),
      maxPeople: cleanString(data.get('maxPeople')),
      basePrice: cleanString(data.get('basePrice')),
      shelterPrice: cleanString(data.get('shelterPrice')),
      extraPrice: cleanString(data.get('extraPrice')),
      reservationUrl: cleanString(data.get('reservationUrl')),
      reservationStatus: cleanString(data.get('reservationStatus')) || 'open',
      reservationButtonLabel: cleanString(data.get('reservationButtonLabel')),
      reservationNote: cleanString(data.get('reservationNote'))
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try { await persistConfig('운영정보를 저장했습니다.'); }
    catch (error) {
      console.error(error);
      showToast('운영정보 저장에 실패했습니다. Firebase 권한을 확인해 주세요.', true);
    } finally { button.disabled = false; }
  });

  document.querySelector('[data-form="popup"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.announcement = {
      ...state.config.announcement,
      enabled: form.elements.announcementEnabled.checked,
      title: cleanString(data.get('announcementTitle')),
      text: cleanString(data.get('announcementText')),
      button: cleanString(data.get('announcementButton')),
      url: cleanString(data.get('announcementUrl')),
      startDate: cleanString(data.get('announcementStart')),
      endDate: cleanString(data.get('announcementEnd'))
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try { await persistConfig('팝업 · 띠배너 설정을 저장했습니다.'); }
    catch (error) {
      console.error(error);
      showToast('팝업 설정 저장에 실패했습니다. Firebase 권한을 확인해 주세요.', true);
    } finally { button.disabled = false; }
  });

  document.querySelector('[data-form="settings"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.seo = {
      ...state.config.seo,
      title: cleanString(data.get('seoTitle')),
      description: cleanString(data.get('seoDescription')),
      keywords: cleanString(data.get('seoKeywords')),
      ogImage: cleanString(data.get('ogImage'))
    };
    state.config.links = {
      ...state.config.links,
      instagram: cleanString(data.get('instagramUrl')),
      naverMap: cleanString(data.get('naverMapUrl'))
    };
    state.config.business = {
      ...state.config.business,
      company: cleanString(data.get('company')),
      representative: cleanString(data.get('representative')),
      businessNumber: cleanString(data.get('businessNumber')),
      tourismNumber: cleanString(data.get('tourismNumber')),
      address: cleanString(data.get('businessAddress')),
      email: cleanString(data.get('businessEmail'))
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try { await persistConfig('사이트 설정을 저장했습니다.'); }
    catch (error) {
      console.error(error);
      showToast('사이트 설정 저장에 실패했습니다. Firebase 권한을 확인해 주세요.', true);
    } finally { button.disabled = false; }
  });
}

function safeFilename(file) {
  const extension = String(file.name || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

function bindUploads() {
  document.querySelectorAll('[data-upload]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const status = document.querySelector(`[data-upload-status="${input.dataset.upload}"]`);
      if (!file.type.startsWith('image/')) {
        if (status) status.textContent = '이미지 파일만 업로드할 수 있습니다.';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        if (status) status.textContent = '이미지는 10MB 이하로 업로드해 주세요.';
        return;
      }
      if (!storage || !auth?.currentUser) {
        if (status) status.textContent = 'Firebase Storage를 사용할 수 없습니다.';
        return;
      }
      input.disabled = true;
      if (status) status.textContent = '이미지를 업로드하고 있습니다...';
      try {
        const target = storageRef(storage, `cms/home/${safeFilename(file)}`);
        await uploadBytes(target, file, { contentType: file.type });
        const url = await getDownloadURL(target);
        state.config.home.heroImageUrl = url;
        const form = document.querySelector('[data-form="homepage"]');
        setFormValue(form, 'heroImageUrl', url);
        renderHeroPreview();
        if (status) status.textContent = '업로드 완료. 홈페이지 저장 버튼을 눌러 적용해 주세요.';
      } catch (error) {
        console.error('[RE:LIM CMS UPLOAD]', error);
        if (status) status.textContent = '업로드에 실패했습니다. Storage 권한을 확인하거나 이미지 URL을 직접 입력해 주세요.';
      } finally {
        input.disabled = false;
        input.value = '';
      }
    });
  });
}

function renderDashboardStats() {
  const inquiryTotal = document.querySelector('[data-stat-inquiries]');
  const waiting = document.querySelector('[data-stat-waiting]');
  const members = document.querySelector('[data-stat-members]');
  const notices = document.querySelector('[data-stat-notices]');
  if (inquiryTotal) inquiryTotal.textContent = String(state.questions.length);
  if (waiting) waiting.textContent = String(state.questions.filter((item) => item.status !== '답변완료').length);
  if (members) members.textContent = String(state.members.length);
  if (notices) notices.textContent = String((state.config.notices || []).length);
}

function questionRows(target, items) {
  target?.replaceChildren();
  items.forEach((item) => {
    const completed = item.status === '답변완료';
    const tr = document.createElement('tr');
    const statusTd = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `admin-badge${completed ? ' done' : ''}`;
    badge.textContent = completed ? '답변완료' : '답변대기';
    statusTd.append(badge);
    const actionTd = document.createElement('td');
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'admin-row-button';
    action.textContent = '내용 보기';
    action.addEventListener('click', () => openQuestion(item));
    actionTd.append(action);
    tr.append(
      statusTd,
      makeCell(item.category || '문의', 'admin-muted'),
      makeCell(item.title || '문의', 'admin-title-cell'),
      makeCell(item.userName || '작성자', 'admin-muted'),
      makeCell(formatDate(item.createdAt), 'admin-muted'),
      actionTd
    );
    target?.append(tr);
  });
}

function renderQuestions(snapshot) {
  state.questions = snapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));

  questionRows(document.querySelector('[data-inquiry-table]'), state.questions);
  questionRows(document.querySelector('[data-dashboard-inquiry-table]'), state.questions.slice(0, 5));
  const count = document.querySelector('[data-inquiry-count]');
  if (count) count.textContent = `${state.questions.length}건`;
  const empty = document.querySelector('[data-inquiry-empty]');
  if (empty) empty.hidden = state.questions.length > 0;
  const dashboardEmpty = document.querySelector('[data-dashboard-inquiry-empty]');
  if (dashboardEmpty) dashboardEmpty.hidden = state.questions.length > 0;
  renderDashboardStats();
}

function renderMembers(snapshot) {
  state.members = snapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => (toDate(b.lastLoginAt)?.getTime() || 0) - (toDate(a.lastLoginAt)?.getTime() || 0));
  const table = document.querySelector('[data-member-table]');
  table?.replaceChildren();
  state.members.forEach((item) => {
    const tr = document.createElement('tr');
    tr.append(
      makeCell(item.name || '리림 회원'),
      makeCell(item.email || '-', 'admin-muted'),
      makeCell(item.provider || 'password', 'admin-muted'),
      makeCell(formatDate(item.createdAt), 'admin-muted'),
      makeCell(formatDate(item.lastLoginAt, true), 'admin-muted')
    );
    table?.append(tr);
  });
  const count = document.querySelector('[data-member-count]');
  if (count) count.textContent = `${state.members.length}명`;
  const empty = document.querySelector('[data-member-empty]');
  if (empty) empty.hidden = state.members.length > 0;
  renderDashboardStats();
}

const inquiryModal = document.getElementById('adminInquiryModal');
const inquiryCategory = inquiryModal?.querySelector('[data-admin-inquiry-category]');
const inquiryTitle = inquiryModal?.querySelector('[data-admin-inquiry-title]');
const inquiryMeta = inquiryModal?.querySelector('[data-admin-inquiry-meta]');
const inquiryContent = inquiryModal?.querySelector('[data-admin-inquiry-content]');
const answerView = inquiryModal?.querySelector('[data-admin-answer-view]');
const answerText = inquiryModal?.querySelector('[data-admin-answer-text]');
const answerForm = inquiryModal?.querySelector('[data-admin-answer-form]');
const answerStatus = inquiryModal?.querySelector('[data-admin-answer-status]');
const openInquiryLink = inquiryModal?.querySelector('[data-admin-open-inquiry]');

async function openQuestion(item) {
  if (!item || !db || !inquiryModal) return;
  try {
    const bodySnapshot = await getDoc(doc(db, 'questions', item.id, 'private', 'body'));
    if (!bodySnapshot.exists()) {
      showToast('문의 본문이 없습니다.', true);
      return;
    }
    state.activeQuestion = item;
    state.questionBody = bodySnapshot.data();
    if (inquiryCategory) inquiryCategory.textContent = item.category || '문의';
    if (inquiryTitle) inquiryTitle.textContent = item.title || '문의';
    if (inquiryMeta) inquiryMeta.textContent = `${item.userName || '작성자'} · ${formatDate(item.createdAt, true)} · ${item.status || '답변대기'}`;
    if (inquiryContent) inquiryContent.textContent = state.questionBody.content || '';
    if (answerView) answerView.hidden = !state.questionBody.answer;
    if (answerText) answerText.textContent = state.questionBody.answer || '';
    if (answerForm?.elements.answer) answerForm.elements.answer.value = state.questionBody.answer || '';
    if (openInquiryLink) openInquiryLink.href = `inquiry.html?id=${encodeURIComponent(item.id)}`;
    setInlineStatus(answerStatus);
    openModal(inquiryModal);
  } catch (error) {
    console.error('[RE:LIM ADMIN QUESTION]', error);
    showToast('문의 내용을 불러오지 못했습니다.', true);
  }
}

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.activeQuestion || !db) return;
  const answer = cleanString(new FormData(answerForm).get('answer'));
  if (answer.length < 2) return setInlineStatus(answerStatus, '답변 내용을 입력해 주세요.', true);
  const button = answerForm.querySelector('[type="submit"]');
  button.disabled = true;
  setInlineStatus(answerStatus, '답변을 저장하고 있습니다.');
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'questions', state.activeQuestion.id, 'private', 'body'), {
      answer,
      answeredAt: now,
      answeredBy: auth.currentUser?.email || 'RE:LIM',
      updatedAt: now
    });
    await updateDoc(doc(db, 'questions', state.activeQuestion.id), {
      status: '답변완료',
      updatedAt: now
    });
    if (answerView) answerView.hidden = false;
    if (answerText) answerText.textContent = answer;
    setInlineStatus(answerStatus, '관리자 답변을 저장했습니다.');
  } catch (error) {
    console.error('[RE:LIM ADMIN ANSWER]', error);
    setInlineStatus(answerStatus, '답변 저장에 실패했습니다.', true);
  } finally { button.disabled = false; }
});

function renderNotices() {
  const list = document.querySelector('[data-notice-list]');
  const empty = document.querySelector('[data-notice-empty]');
  const notices = [...(state.config.notices || [])].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  list?.replaceChildren();
  notices.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'admin-list-item';
    const main = document.createElement('div');
    main.className = 'admin-list-main';
    const meta = document.createElement('div');
    meta.className = 'admin-list-meta';
    meta.textContent = `${item.enabled === false ? '비노출' : '노출'}${item.pinned ? ' · 상단 고정' : ''}${item.startDate ? ` · ${item.startDate}` : ''}${item.endDate ? ` ~ ${item.endDate}` : ''}`;
    const title = document.createElement('h3');
    title.className = 'admin-list-title';
    title.textContent = item.title || '제목 없음';
    const copy = document.createElement('p');
    copy.className = 'admin-list-copy';
    copy.textContent = item.content || '';
    main.append(meta, title, copy);
    const actions = document.createElement('div');
    actions.className = 'admin-list-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.textContent = '수정';
    edit.addEventListener('click', () => openNoticeEditor(item));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '삭제'; remove.className = 'danger';
    remove.addEventListener('click', () => removeNotice(item.id));
    actions.append(edit, remove);
    row.append(main, actions);
    list?.append(row);
  });
  if (empty) empty.hidden = notices.length > 0;
}

const noticeModal = document.getElementById('noticeEditorModal');
const noticeForm = noticeModal?.querySelector('[data-notice-form]');

function openNoticeEditor(item = null) {
  if (!noticeForm || !noticeModal) return;
  noticeForm.reset();
  noticeForm.elements.id.value = item?.id || '';
  noticeForm.elements.title.value = item?.title || '';
  noticeForm.elements.content.value = item?.content || '';
  noticeForm.elements.startDate.value = item?.startDate || '';
  noticeForm.elements.endDate.value = item?.endDate || '';
  noticeForm.elements.pinned.checked = Boolean(item?.pinned);
  noticeForm.elements.enabled.checked = item ? item.enabled !== false : true;
  const modalTitle = noticeModal.querySelector('[data-notice-modal-title]');
  if (modalTitle) modalTitle.textContent = item ? '공지 수정' : '공지 등록';
  openModal(noticeModal);
}

document.querySelector('[data-notice-add]')?.addEventListener('click', () => openNoticeEditor());
noticeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(noticeForm);
  const id = cleanString(data.get('id')) || uid('notice');
  const existing = (state.config.notices || []).find((item) => item.id === id);
  const item = {
    id,
    title: cleanString(data.get('title')),
    content: cleanString(data.get('content')),
    startDate: cleanString(data.get('startDate')),
    endDate: cleanString(data.get('endDate')),
    pinned: noticeForm.elements.pinned.checked,
    enabled: noticeForm.elements.enabled.checked,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const others = (state.config.notices || []).filter((notice) => notice.id !== id);
  state.config.notices = [...others, item];
  const button = noticeForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await persistConfig(existing ? '공지를 수정했습니다.' : '공지를 등록했습니다.');
    renderNotices();
    closeModal(noticeModal);
  } catch (error) {
    console.error(error);
    showToast('공지 저장에 실패했습니다.', true);
  } finally { button.disabled = false; }
});

async function removeNotice(id) {
  if (!window.confirm('이 공지를 삭제할까요?')) return;
  const before = state.config.notices || [];
  state.config.notices = before.filter((item) => item.id !== id);
  try {
    await persistConfig('공지를 삭제했습니다.');
    renderNotices();
  } catch (error) {
    state.config.notices = before;
    showToast('공지 삭제에 실패했습니다.', true);
  }
}

function renderFaqs() {
  const list = document.querySelector('[data-faq-admin-list]');
  const empty = document.querySelector('[data-faq-admin-empty]');
  const faqs = state.config.faqs || [];
  list?.replaceChildren();
  faqs.forEach((item, index) => {
    const row = document.createElement('article');
    row.className = 'admin-list-item';
    const main = document.createElement('div');
    main.className = 'admin-list-main';
    const meta = document.createElement('div');
    meta.className = 'admin-list-meta';
    meta.textContent = `${String(index + 1).padStart(2, '0')} · ${item.category || '기타'} · ${item.enabled === false ? '비노출' : '노출'}`;
    const title = document.createElement('h3');
    title.className = 'admin-list-title';
    title.textContent = item.question || '질문 없음';
    const copy = document.createElement('p');
    copy.className = 'admin-list-copy';
    copy.textContent = item.answer || '';
    main.append(meta, title, copy);
    const actions = document.createElement('div');
    actions.className = 'admin-list-actions';
    const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = '위로';
    const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.title = '아래로';
    up.disabled = index === 0; down.disabled = index === faqs.length - 1;
    up.addEventListener('click', () => moveFaq(index, -1));
    down.addEventListener('click', () => moveFaq(index, 1));
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '수정'; edit.addEventListener('click', () => openFaqEditor(item));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제'; remove.className = 'danger'; remove.addEventListener('click', () => removeFaq(item.id));
    actions.append(up, down, edit, remove);
    row.append(main, actions);
    list?.append(row);
  });
  if (empty) empty.hidden = faqs.length > 0;
}

const faqModal = document.getElementById('faqEditorModal');
const faqForm = faqModal?.querySelector('[data-faq-form]');

function openFaqEditor(item = null) {
  if (!faqForm || !faqModal) return;
  faqForm.reset();
  faqForm.elements.id.value = item?.id || '';
  faqForm.elements.category.value = item?.category || '';
  faqForm.elements.question.value = item?.question || '';
  faqForm.elements.answer.value = item?.answer || '';
  faqForm.elements.keywords.value = Array.isArray(item?.keywords) ? item.keywords.join(', ') : '';
  faqForm.elements.enabled.checked = item ? item.enabled !== false : true;
  const modalTitle = faqModal.querySelector('[data-faq-modal-title]');
  if (modalTitle) modalTitle.textContent = item ? 'FAQ 수정' : 'FAQ 등록';
  openModal(faqModal);
}

document.querySelector('[data-faq-add]')?.addEventListener('click', () => openFaqEditor());
faqForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(faqForm);
  const id = cleanString(data.get('id')) || uid('faq');
  const item = {
    id,
    category: cleanString(data.get('category')),
    question: cleanString(data.get('question')),
    answer: cleanString(data.get('answer')),
    keywords: cleanString(data.get('keywords')).split(',').map((value) => value.trim()).filter(Boolean),
    enabled: faqForm.elements.enabled.checked
  };
  const faqs = [...(state.config.faqs || [])];
  const index = faqs.findIndex((faq) => faq.id === id);
  if (index >= 0) faqs[index] = item;
  else faqs.push(item);
  state.config.faqs = faqs;
  const button = faqForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await persistConfig(index >= 0 ? 'FAQ를 수정했습니다.' : 'FAQ를 등록했습니다.');
    renderFaqs();
    closeModal(faqModal);
  } catch (error) {
    console.error(error);
    showToast('FAQ 저장에 실패했습니다.', true);
  } finally { button.disabled = false; }
});

async function moveFaq(index, direction) {
  const faqs = [...(state.config.faqs || [])];
  const target = index + direction;
  if (target < 0 || target >= faqs.length) return;
  [faqs[index], faqs[target]] = [faqs[target], faqs[index]];
  state.config.faqs = faqs;
  renderFaqs();
  try { await persistConfig('FAQ 순서를 변경했습니다.'); }
  catch (error) { showToast('FAQ 순서 저장에 실패했습니다.', true); }
}

async function removeFaq(id) {
  if (!window.confirm('이 FAQ를 삭제할까요?')) return;
  const before = state.config.faqs || [];
  state.config.faqs = before.filter((item) => item.id !== id);
  renderFaqs();
  try { await persistConfig('FAQ를 삭제했습니다.'); }
  catch (error) {
    state.config.faqs = before;
    renderFaqs();
    showToast('FAQ 삭제에 실패했습니다.', true);
  }
}

function startRealtimeData() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  state.unsubscribers = [
    onSnapshot(collection(db, 'questions'), renderQuestions, (error) => console.error('[RE:LIM ADMIN QUESTIONS]', error)),
    onSnapshot(collection(db, 'users'), renderMembers, (error) => console.error('[RE:LIM ADMIN MEMBERS]', error))
  ];
}

function startAdmin(user) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = true;
  if (dashboardRoot) dashboardRoot.hidden = false;
  if (session) session.textContent = `ADMIN · ${user.email || ''}`;
  loadConfig();
  startRealtimeData();
}

function bindGlobalActions() {
  document.querySelector('[data-admin-logout]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await signOut(auth);
      location.href = 'login.html?return=admin.html';
    } finally { button.disabled = false; }
  });

  document.querySelectorAll('[data-admin-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.admin-modal')));
  });
  document.querySelectorAll('.admin-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelectorAll('.admin-modal.is-open').forEach(closeModal);
  });
}

bindNavigation();
bindSubtabs();
bindForms();
bindUploads();
bindGlobalActions();

if (!auth || !db) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = false;
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.replace('login.html?return=admin.html');
      return;
    }
    if (!isAdmin(user)) {
      if (loading) loading.hidden = true;
      if (dashboardRoot) dashboardRoot.hidden = true;
      if (denied) denied.hidden = false;
      return;
    }
    startAdmin(user);
  });
}
