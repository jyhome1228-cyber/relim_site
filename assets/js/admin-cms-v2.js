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
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com', 'penury@naver.com']);
const CONFIG_REF = ['siteConfig', 'public'];
const RESERVATION_URL = 'https://camfit.co.kr/camp/6a6b276b521182001db33430?keyword=%EB%A6%AC%EB%A6%BC&adultCnt=2';

const DEFAULT_CONFIG = {
  version: 3,
  home: {
    eyebrow: 'RE:LIM IN YONGIN',
    title: '숲과 물, 쉼과 식사가 이어지는 하루',
    description: '용인에서 수영장·유수풀·개별 쉘터·바비큐를 한 공간에서 즐기는 가족과 친구를 위한 프라이빗 아웃도어 공간입니다.',
    reservationLabel: '예약하기',
    aboutLabel: '공간 둘러보기',
    heroImageUrl: ''
  },
  operation: {
    facilityName: '리림',
    phone: '010-5794-8823',
    address: '경기도 용인시 처인구 원삼면 보개원삼로1372번길 45',
    email: 'penury@naver.com',
    holidayNote: '',
    morningHours: '10:00–15:00',
    afternoonHours: '16:00–21:00',
    maxPeople: '10인',
    basePrice: '25,000원',
    shelterPrice: '150,000원',
    extraPrice: '',
    reservationUrl: RESERVATION_URL,
    reservationStatus: 'open',
    reservationButtonLabel: '예약하기',
    reservationNote: ''
  },
  announcement: {
    enabled: true,
    title: 'WELCOME TO RE:LIM',
    text: '리림 예약이 오픈되었습니다. 원하는 날짜와 시간을 확인해 보세요.',
    button: '예약하러 가기',
    url: RESERVATION_URL,
    startDate: '',
    endDate: ''
  },
  notices: [],
  faqs: [],
  seo: {
    title: '리림 RE:LIM | 용인 캠핑장·수영장·유수풀·당일 글램핑',
    description: '용인 원삼면 리림 RE:LIM. 야외 수영장·유수풀·개별 쉘터·바베큐를 오전·오후 타임제로 즐기는 가족 캠프닉·당일 글램핑 공간입니다.',
    keywords: '리림, RE:LIM, 용인 리림, 용인 캠핑장, 용인 캠핑, 용인 글램핑, 용인 당일 글램핑, 용인 캠프닉, 용인 수영장, 용인 유수풀, 용인 바베큐, 용인 바베큐장, 서울 근교 캠핑장, 서울 근교 글램핑, 경기 근교 캠핑장, 당일 캠핑, 개별 쉘터, 가족 나들이',
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
  config: clone(DEFAULT_CONFIG),
  questions: [],
  members: [],
  activeQuestion: null,
  activeQuestionBody: null,
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

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function isAdmin(user) {
  return ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());
}

function clean(value) {
  return String(value ?? '').trim();
}

function mergeConfig(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return base;
  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      base[key] = value;
    } else if (value && typeof value === 'object' && typeof value.toDate !== 'function') {
      base[key] = mergeConfig(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
    } else {
      base[key] = value;
    }
  });
  return base;
}

function uid(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
  document.querySelectorAll('[data-admin-view]').forEach((view) => view.classList.toggle('is-active', view.dataset.adminView === name));
  document.querySelectorAll('[data-admin-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.adminTab === name));
  const meta = TAB_META[name] || TAB_META.dashboard;
  if (pageTitle) pageTitle.textContent = meta[0];
  if (pageDescription) pageDescription.textContent = meta[1];
  document.body.classList.remove('admin-menu-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSubtab(group, name) {
  const buttonSelector = group === 'content' ? '[data-content-tab]' : '[data-customer-tab]';
  const viewSelector = group === 'content' ? '[data-content-view]' : '[data-customer-view]';
  const buttonKey = group === 'content' ? 'contentTab' : 'customerTab';
  const viewKey = group === 'content' ? 'contentView' : 'customerView';
  document.querySelectorAll(buttonSelector).forEach((button) => button.classList.toggle('is-active', button.dataset[buttonKey] === name));
  document.querySelectorAll(viewSelector).forEach((view) => view.classList.toggle('is-active', view.dataset[viewKey] === name));
}

function bindNavigation() {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => button.addEventListener('click', () => showTab(button.dataset.adminTab)));
  document.querySelectorAll('[data-admin-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      showTab(button.dataset.adminJump);
      if (button.dataset.adminJump === 'content' && button.dataset.contentFocus) showSubtab('content', button.dataset.contentFocus);
    });
  });
  document.querySelectorAll('[data-content-tab]').forEach((button) => button.addEventListener('click', () => showSubtab('content', button.dataset.contentTab)));
  document.querySelectorAll('[data-customer-tab]').forEach((button) => button.addEventListener('click', () => showSubtab('customer', button.dataset.customerTab)));
  document.querySelector('[data-admin-menu]')?.addEventListener('click', () => document.body.classList.toggle('admin-menu-open'));
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

  [['homeEyebrow', home.eyebrow], ['homeTitle', home.title], ['homeDescription', home.description], ['reservationLabel', home.reservationLabel], ['aboutLabel', home.aboutLabel], ['heroImageUrl', home.heroImageUrl]].forEach(([name, value]) => setFormValue(homeForm, name, value));
  [
    ['facilityName', operation.facilityName], ['phone', operation.phone], ['address', operation.address], ['email', operation.email], ['holidayNote', operation.holidayNote],
    ['morningHours', operation.morningHours], ['afternoonHours', operation.afternoonHours], ['maxPeople', operation.maxPeople], ['basePrice', operation.basePrice], ['shelterPrice', operation.shelterPrice],
    ['extraPrice', operation.extraPrice], ['reservationUrl', operation.reservationUrl], ['reservationStatus', operation.reservationStatus], ['reservationButtonLabel', operation.reservationButtonLabel], ['reservationNote', operation.reservationNote]
  ].forEach(([name, value]) => setFormValue(operationForm, name, value));
  [
    ['announcementEnabled', announcement.enabled], ['announcementTitle', announcement.title], ['announcementText', announcement.text], ['announcementButton', announcement.button],
    ['announcementUrl', announcement.url], ['announcementStart', announcement.startDate], ['announcementEnd', announcement.endDate]
  ].forEach(([name, value]) => setFormValue(popupForm, name, value));
  [
    ['seoTitle', seo.title], ['seoDescription', seo.description], ['seoKeywords', seo.keywords], ['ogImage', seo.ogImage],
    ['instagramUrl', links.instagram], ['naverMapUrl', links.naverMap], ['company', business.company], ['representative', business.representative],
    ['businessNumber', business.businessNumber], ['tourismNumber', business.tourismNumber], ['businessAddress', business.address], ['businessEmail', business.email]
  ].forEach(([name, value]) => setFormValue(settingsForm, name, value));
  renderHeroPreview();
}

async function loadConfig() {
  try {
    const snapshot = await getDoc(doc(db, ...CONFIG_REF));
    state.config = snapshot.exists() ? mergeConfig(clone(DEFAULT_CONFIG), snapshot.data()) : clone(DEFAULT_CONFIG);
  } catch (error) {
    console.error('[RE:LIM CMS CONFIG LOAD]', error);
    state.config = clone(DEFAULT_CONFIG);
    showToast('사이트 설정을 불러오지 못했습니다. Firebase 규칙을 확인해 주세요.', true);
  }
  fillForms();
  renderNotices();
  renderFaqs();
  renderDashboardStats();
}

async function saveConfig(message) {
  if (!auth?.currentUser || !isAdmin(auth.currentUser)) throw new Error('관리자 권한이 없습니다.');
  state.config.version = 3;
  state.config.updatedAt = Timestamp.now();
  state.config.updatedBy = auth.currentUser.email || '';
  await setDoc(doc(db, ...CONFIG_REF), state.config);
  renderDashboardStats();
  showToast(message);
}

function renderHeroPreview() {
  const preview = document.querySelector('[data-preview="hero"]');
  if (!preview) return;
  preview.replaceChildren();
  const url = clean(state.config.home.heroImageUrl);
  if (!url) {
    const span = document.createElement('span');
    span.textContent = '현재 사이트의 기본 메인 이미지를 사용합니다.';
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
      eyebrow: clean(data.get('homeEyebrow')),
      title: clean(data.get('homeTitle')),
      description: clean(data.get('homeDescription')),
      reservationLabel: clean(data.get('reservationLabel')),
      aboutLabel: clean(data.get('aboutLabel')),
      heroImageUrl: clean(data.get('heroImageUrl'))
    };
    await saveForm(form, '홈페이지 콘텐츠를 저장했습니다.');
    renderHeroPreview();
  });

  document.querySelector('[data-form="operation"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.operation = {
      ...state.config.operation,
      facilityName: clean(data.get('facilityName')),
      phone: clean(data.get('phone')),
      address: clean(data.get('address')),
      email: clean(data.get('email')),
      holidayNote: clean(data.get('holidayNote')),
      morningHours: clean(data.get('morningHours')),
      afternoonHours: clean(data.get('afternoonHours')),
      maxPeople: clean(data.get('maxPeople')),
      basePrice: clean(data.get('basePrice')),
      shelterPrice: clean(data.get('shelterPrice')),
      extraPrice: clean(data.get('extraPrice')),
      reservationUrl: clean(data.get('reservationUrl')),
      reservationStatus: clean(data.get('reservationStatus')) || 'open',
      reservationButtonLabel: clean(data.get('reservationButtonLabel')),
      reservationNote: clean(data.get('reservationNote'))
    };
    await saveForm(form, '운영정보를 저장했습니다.');
  });

  document.querySelector('[data-form="popup"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.announcement = {
      ...state.config.announcement,
      enabled: form.elements.announcementEnabled.checked,
      title: clean(data.get('announcementTitle')),
      text: clean(data.get('announcementText')),
      button: clean(data.get('announcementButton')),
      url: clean(data.get('announcementUrl')),
      startDate: clean(data.get('announcementStart')),
      endDate: clean(data.get('announcementEnd'))
    };
    await saveForm(form, '팝업 · 띠배너 설정을 저장했습니다.');
  });

  document.querySelector('[data-form="settings"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    state.config.seo = { ...state.config.seo, title: clean(data.get('seoTitle')), description: clean(data.get('seoDescription')), keywords: clean(data.get('seoKeywords')), ogImage: clean(data.get('ogImage')) };
    state.config.links = { ...state.config.links, instagram: clean(data.get('instagramUrl')), naverMap: clean(data.get('naverMapUrl')) };
    state.config.business = {
      ...state.config.business,
      company: clean(data.get('company')), representative: clean(data.get('representative')), businessNumber: clean(data.get('businessNumber')),
      tourismNumber: clean(data.get('tourismNumber')), address: clean(data.get('businessAddress')), email: clean(data.get('businessEmail'))
    };
    await saveForm(form, '사이트 설정을 저장했습니다.');
  });
}

async function saveForm(form, message) {
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  try {
    await saveConfig(message);
  } catch (error) {
    console.error('[RE:LIM CMS SAVE]', error);
    showToast('저장에 실패했습니다. Firebase 규칙이 배포되어 있는지 확인해 주세요.', true);
  } finally {
    if (button) button.disabled = false;
  }
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
      if (!file.type.startsWith('image/')) return void (status && (status.textContent = '이미지 파일만 업로드할 수 있습니다.'));
      if (file.size > 10 * 1024 * 1024) return void (status && (status.textContent = '이미지는 10MB 이하로 업로드해 주세요.'));
      if (!storage || !auth?.currentUser) return void (status && (status.textContent = 'Firebase Storage를 사용할 수 없습니다.'));

      input.disabled = true;
      if (status) status.textContent = '이미지를 업로드하고 있습니다...';
      try {
        const target = storageRef(storage, `cms/home/${safeFilename(file)}`);
        await uploadBytes(target, file, { contentType: file.type });
        const url = await getDownloadURL(target);
        state.config.home.heroImageUrl = url;
        setFormValue(document.querySelector('[data-form="homepage"]'), 'heroImageUrl', url);
        renderHeroPreview();
        if (status) status.textContent = '업로드 완료. 홈페이지 저장 버튼을 눌러 적용해 주세요.';
      } catch (error) {
        console.error('[RE:LIM CMS UPLOAD]', error);
        if (status) status.textContent = '업로드에 실패했습니다. Storage 규칙을 확인하거나 이미지 URL을 직접 입력해 주세요.';
      } finally {
        input.disabled = false;
        input.value = '';
      }
    });
  });
}

function renderDashboardStats() {
  const values = {
    '[data-stat-inquiries]': state.questions.length,
    '[data-stat-waiting]': state.questions.filter((item) => item.status !== '답변완료').length,
    '[data-stat-members]': state.members.length,
    '[data-stat-notices]': (state.config.notices || []).length
  };
  Object.entries(values).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(value);
  });
}

function renderQuestionRows(target, items) {
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
    action.type = 'button'; action.className = 'admin-row-button'; action.textContent = '내용 보기';
    action.addEventListener('click', () => openQuestion(item));
    actionTd.append(action);
    tr.append(statusTd, makeCell(item.category || '문의', 'admin-muted'), makeCell(item.title || '문의', 'admin-title-cell'), makeCell(item.userName || '작성자', 'admin-muted'), makeCell(formatDate(item.createdAt), 'admin-muted'), actionTd);
    target?.append(tr);
  });
}

function renderQuestions(snapshot) {
  state.questions = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
  renderQuestionRows(document.querySelector('[data-inquiry-table]'), state.questions);
  renderQuestionRows(document.querySelector('[data-dashboard-inquiry-table]'), state.questions.slice(0, 5));
  const count = document.querySelector('[data-inquiry-count]');
  if (count) count.textContent = `${state.questions.length}건`;
  const empty = document.querySelector('[data-inquiry-empty]');
  if (empty) empty.hidden = state.questions.length > 0;
  const dashboardEmpty = document.querySelector('[data-dashboard-inquiry-empty]');
  if (dashboardEmpty) dashboardEmpty.hidden = state.questions.length > 0;
  renderDashboardStats();
}

function renderMembers(snapshot) {
  state.members = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .sort((a, b) => (toDate(b.lastLoginAt)?.getTime() || 0) - (toDate(a.lastLoginAt)?.getTime() || 0));
  const table = document.querySelector('[data-member-table]');
  table?.replaceChildren();
  state.members.forEach((item) => {
    const tr = document.createElement('tr');
    tr.append(makeCell(item.name || '리림 회원'), makeCell(item.email || '-', 'admin-muted'), makeCell(item.provider || 'password', 'admin-muted'), makeCell(formatDate(item.createdAt), 'admin-muted'), makeCell(formatDate(item.lastLoginAt, true), 'admin-muted'));
    table?.append(tr);
  });
  const count = document.querySelector('[data-member-count]');
  if (count) count.textContent = `${state.members.length}명`;
  const empty = document.querySelector('[data-member-empty]');
  if (empty) empty.hidden = state.members.length > 0;
  renderDashboardStats();
}

const inquiryModal = document.getElementById('adminInquiryModal');
const answerForm = inquiryModal?.querySelector('[data-admin-answer-form]');
const answerStatus = inquiryModal?.querySelector('[data-admin-answer-status]');

async function openQuestion(item) {
  try {
    const bodySnapshot = await getDoc(doc(db, 'questions', item.id, 'private', 'body'));
    if (!bodySnapshot.exists()) return showToast('문의 본문이 없습니다.', true);
    state.activeQuestion = item;
    state.activeQuestionBody = bodySnapshot.data();
    inquiryModal.querySelector('[data-admin-inquiry-category]').textContent = item.category || '문의';
    inquiryModal.querySelector('[data-admin-inquiry-title]').textContent = item.title || '문의';
    inquiryModal.querySelector('[data-admin-inquiry-meta]').textContent = `${item.userName || '작성자'} · ${formatDate(item.createdAt, true)} · ${item.status || '답변대기'}`;
    inquiryModal.querySelector('[data-admin-inquiry-content]').textContent = state.activeQuestionBody.content || '';
    const answerView = inquiryModal.querySelector('[data-admin-answer-view]');
    answerView.hidden = !state.activeQuestionBody.answer;
    inquiryModal.querySelector('[data-admin-answer-text]').textContent = state.activeQuestionBody.answer || '';
    answerForm.elements.answer.value = state.activeQuestionBody.answer || '';
    inquiryModal.querySelector('[data-admin-open-inquiry]').href = `inquiry.html?id=${encodeURIComponent(item.id)}`;
    setInlineStatus(answerStatus);
    openModal(inquiryModal);
  } catch (error) {
    console.error('[RE:LIM ADMIN QUESTION]', error);
    showToast('문의 내용을 불러오지 못했습니다.', true);
  }
}

answerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.activeQuestion) return;
  const answer = clean(new FormData(answerForm).get('answer'));
  if (answer.length < 2) return setInlineStatus(answerStatus, '답변 내용을 입력해 주세요.', true);
  const button = answerForm.querySelector('[type="submit"]');
  button.disabled = true;
  setInlineStatus(answerStatus, '답변을 저장하고 있습니다.');
  try {
    const now = Timestamp.now();
    await updateDoc(doc(db, 'questions', state.activeQuestion.id, 'private', 'body'), { answer, answeredAt: now, answeredBy: auth.currentUser?.email || 'RE:LIM', updatedAt: now });
    await updateDoc(doc(db, 'questions', state.activeQuestion.id), { status: '답변완료', updatedAt: now });
    inquiryModal.querySelector('[data-admin-answer-view]').hidden = false;
    inquiryModal.querySelector('[data-admin-answer-text]').textContent = answer;
    setInlineStatus(answerStatus, '관리자 답변을 저장했습니다.');
  } catch (error) {
    console.error('[RE:LIM ADMIN ANSWER]', error);
    setInlineStatus(answerStatus, '답변 저장에 실패했습니다.', true);
  } finally { button.disabled = false; }
});

const noticeModal = document.getElementById('noticeEditorModal');
const noticeForm = noticeModal?.querySelector('[data-notice-form]');

function renderNotices() {
  const list = document.querySelector('[data-notice-list]');
  const empty = document.querySelector('[data-notice-empty]');
  const notices = [...(state.config.notices || [])].sort((a, b) => Boolean(a.pinned) !== Boolean(b.pinned) ? (a.pinned ? -1 : 1) : String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  list?.replaceChildren();
  notices.forEach((item) => {
    const row = document.createElement('article'); row.className = 'admin-list-item';
    const main = document.createElement('div'); main.className = 'admin-list-main';
    const meta = document.createElement('div'); meta.className = 'admin-list-meta'; meta.textContent = `${item.enabled === false ? '비노출' : '노출'}${item.pinned ? ' · 상단 고정' : ''}${item.startDate ? ` · ${item.startDate}` : ''}${item.endDate ? ` ~ ${item.endDate}` : ''}`;
    const title = document.createElement('h3'); title.className = 'admin-list-title'; title.textContent = item.title || '제목 없음';
    const copy = document.createElement('p'); copy.className = 'admin-list-copy'; copy.textContent = item.content || '';
    main.append(meta, title, copy);
    const actions = document.createElement('div'); actions.className = 'admin-list-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '수정'; edit.addEventListener('click', () => openNoticeEditor(item));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제'; remove.className = 'danger'; remove.addEventListener('click', () => removeNotice(item.id));
    actions.append(edit, remove); row.append(main, actions); list?.append(row);
  });
  if (empty) empty.hidden = notices.length > 0;
}

function openNoticeEditor(item = null) {
  noticeForm.reset();
  noticeForm.elements.id.value = item?.id || '';
  noticeForm.elements.title.value = item?.title || '';
  noticeForm.elements.content.value = item?.content || '';
  noticeForm.elements.startDate.value = item?.startDate || '';
  noticeForm.elements.endDate.value = item?.endDate || '';
  noticeForm.elements.pinned.checked = Boolean(item?.pinned);
  noticeForm.elements.enabled.checked = item ? item.enabled !== false : true;
  noticeModal.querySelector('[data-notice-modal-title]').textContent = item ? '공지 수정' : '공지 등록';
  openModal(noticeModal);
}

document.querySelector('[data-notice-add]')?.addEventListener('click', () => openNoticeEditor());
noticeForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(noticeForm);
  const id = clean(data.get('id')) || uid('notice');
  const existing = (state.config.notices || []).find((item) => item.id === id);
  const item = {
    id,
    title: clean(data.get('title')),
    content: clean(data.get('content')),
    startDate: clean(data.get('startDate')),
    endDate: clean(data.get('endDate')),
    pinned: noticeForm.elements.pinned.checked,
    enabled: noticeForm.elements.enabled.checked,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.config.notices = [...(state.config.notices || []).filter((notice) => notice.id !== id), item];
  try {
    await saveConfig(existing ? '공지를 수정했습니다.' : '공지를 등록했습니다.');
    renderNotices(); closeModal(noticeModal);
  } catch (error) {
    console.error(error); showToast('공지 저장에 실패했습니다.', true);
  }
});

async function removeNotice(id) {
  if (!window.confirm('이 공지를 삭제할까요?')) return;
  const before = state.config.notices || [];
  state.config.notices = before.filter((item) => item.id !== id);
  try { await saveConfig('공지를 삭제했습니다.'); renderNotices(); }
  catch { state.config.notices = before; showToast('공지 삭제에 실패했습니다.', true); }
}

const faqModal = document.getElementById('faqEditorModal');
const faqForm = faqModal?.querySelector('[data-faq-form]');

function renderFaqs() {
  const list = document.querySelector('[data-faq-admin-list]');
  const empty = document.querySelector('[data-faq-admin-empty]');
  const faqs = state.config.faqs || [];
  list?.replaceChildren();
  faqs.forEach((item, index) => {
    const row = document.createElement('article'); row.className = 'admin-list-item';
    const main = document.createElement('div'); main.className = 'admin-list-main';
    const meta = document.createElement('div'); meta.className = 'admin-list-meta'; meta.textContent = `${String(index + 1).padStart(2, '0')} · ${item.category || '기타'} · ${item.enabled === false ? '비노출' : '노출'}`;
    const title = document.createElement('h3'); title.className = 'admin-list-title'; title.textContent = item.question || '질문 없음';
    const copy = document.createElement('p'); copy.className = 'admin-list-copy'; copy.textContent = item.answer || '';
    main.append(meta, title, copy);
    const actions = document.createElement('div'); actions.className = 'admin-list-actions';
    const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.disabled = index === 0; up.addEventListener('click', () => moveFaq(index, -1));
    const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.disabled = index === faqs.length - 1; down.addEventListener('click', () => moveFaq(index, 1));
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '수정'; edit.addEventListener('click', () => openFaqEditor(item));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제'; remove.className = 'danger'; remove.addEventListener('click', () => removeFaq(item.id));
    actions.append(up, down, edit, remove); row.append(main, actions); list?.append(row);
  });
  if (empty) empty.hidden = faqs.length > 0;
}

function openFaqEditor(item = null) {
  faqForm.reset();
  faqForm.elements.id.value = item?.id || '';
  faqForm.elements.category.value = item?.category || '';
  faqForm.elements.question.value = item?.question || '';
  faqForm.elements.answer.value = item?.answer || '';
  faqForm.elements.keywords.value = Array.isArray(item?.keywords) ? item.keywords.join(', ') : '';
  faqForm.elements.enabled.checked = item ? item.enabled !== false : true;
  faqModal.querySelector('[data-faq-modal-title]').textContent = item ? 'FAQ 수정' : 'FAQ 등록';
  openModal(faqModal);
}

document.querySelector('[data-faq-add]')?.addEventListener('click', () => openFaqEditor());
faqForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(faqForm);
  const id = clean(data.get('id')) || uid('faq');
  const item = {
    id,
    category: clean(data.get('category')),
    question: clean(data.get('question')),
    answer: clean(data.get('answer')),
    keywords: clean(data.get('keywords')).split(',').map((value) => value.trim()).filter(Boolean),
    enabled: faqForm.elements.enabled.checked
  };
  const faqs = [...(state.config.faqs || [])];
  const index = faqs.findIndex((faq) => faq.id === id);
  if (index >= 0) faqs[index] = item; else faqs.push(item);
  state.config.faqs = faqs;
  try {
    await saveConfig(index >= 0 ? 'FAQ를 수정했습니다.' : 'FAQ를 등록했습니다.');
    renderFaqs(); closeModal(faqModal);
  } catch (error) {
    console.error(error); showToast('FAQ 저장에 실패했습니다.', true);
  }
});

async function moveFaq(index, direction) {
  const faqs = [...(state.config.faqs || [])];
  const target = index + direction;
  if (target < 0 || target >= faqs.length) return;
  [faqs[index], faqs[target]] = [faqs[target], faqs[index]];
  state.config.faqs = faqs;
  renderFaqs();
  try { await saveConfig('FAQ 순서를 변경했습니다.'); }
  catch { showToast('FAQ 순서 저장에 실패했습니다.', true); }
}

async function removeFaq(id) {
  if (!window.confirm('이 FAQ를 삭제할까요?')) return;
  const before = state.config.faqs || [];
  state.config.faqs = before.filter((item) => item.id !== id);
  renderFaqs();
  try { await saveConfig('FAQ를 삭제했습니다.'); }
  catch { state.config.faqs = before; renderFaqs(); showToast('FAQ 삭제에 실패했습니다.', true); }
}

function startRealtimeData() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  state.unsubscribers = [
    onSnapshot(collection(db, 'questions'), renderQuestions, (error) => console.error('[RE:LIM ADMIN QUESTIONS]', error)),
    onSnapshot(collection(db, 'users'), renderMembers, (error) => console.error('[RE:LIM ADMIN MEMBERS]', error))
  ];
}

function bindGlobalActions() {
  document.querySelector('[data-admin-logout]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try { await signOut(auth); location.href = 'login.html?return=admin.html'; }
    finally { button.disabled = false; }
  });
  document.querySelectorAll('[data-admin-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.closest('.admin-modal'))));
  document.querySelectorAll('.admin-modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); }));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.querySelectorAll('.admin-modal.is-open').forEach(closeModal); });
}

function startAdmin(user) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = true;
  if (dashboardRoot) dashboardRoot.hidden = false;
  if (session) session.textContent = `ADMIN · ${user.email || ''}`;
  loadConfig();
  startRealtimeData();
}

bindNavigation();
bindForms();
bindUploads();
bindGlobalActions();

if (!auth || !db) {
  if (loading) loading.hidden = true;
  if (denied) denied.hidden = false;
} else {
  onAuthStateChanged(auth, (user) => {
    if (!user) return void location.replace('login.html?return=admin.html');
    if (!isAdmin(user)) {
      if (loading) loading.hidden = true;
      if (dashboardRoot) dashboardRoot.hidden = true;
      if (denied) denied.hidden = false;
      return;
    }
    startAdmin(user);
  });
}
