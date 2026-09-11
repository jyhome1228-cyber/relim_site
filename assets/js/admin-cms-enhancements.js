import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const ADMIN_EMAILS = new Set(['planus253@naver.com', 'penury@naver.com']);
const app = firebaseReady ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;
let currentUser = null;

const DEFAULT_SECTIONS = {
  dayTitle: '물을 따라 걷고,\n숲 가까이 머무는 시간',
  dayDescription: '리림의 하루는 수영장과 캠프닉, 바베큐를 각자의 방식으로 쉬고 즐기는 장면에서 시작됩니다.',
  aboutTitle: '용인에서 수영장과 바베큐를 함께 즐기는\n프라이빗 캠프닉 공간입니다.',
  aboutDescription: '리림은 경기도 용인시 처인구 원삼면에 위치한 야외 복합 공간입니다. 용인 캠핑장이나 당일 글램핑을 찾는 가족과 친구가 수영장과 유수풀, 개별 쉘터, 바베큐 공간과 카페를 한곳에서 이용할 수 있으며 오전·오후 시간제로 운영됩니다.',
  facilitiesTitle: '리림 주요 시설 안내',
  facilitiesDescription: '용인 캠프닉과 물놀이를 함께 즐길 수 있는 수영장, 유수풀, 개별 쉘터와 바베큐 공간의 실제 모습을 예약 전 확인해 주세요.',
  quickGuideTitle: '리림 예약 전 확인해 주세요.',
  quickGuideDescription: '오전과 오후, 머물고 싶은 리림의 시간을 선택해 주세요.',
  ctaTitle: '리림 예약 가능한 날짜와 상품 옵션을 캠핏에서 확인하세요.',
  ctaButtonLabel: '예약하기'
};

function isAdmin(user) {
  return ADMIN_EMAILS.has(String(user?.email || '').toLowerCase());
}

function showMiniToast(message, isError = false) {
  const existing = document.querySelector('[data-admin-toast]');
  if (existing) {
    existing.textContent = message;
    existing.classList.toggle('is-error', isError);
    existing.classList.add('is-visible');
    window.setTimeout(() => existing.classList.remove('is-visible'), 3000);
    return;
  }
  window.alert(message);
}

function injectHomepageSectionEditor() {
  if (document.querySelector('[data-home-section-editor]')) return;
  const form = document.querySelector('[data-form="homepage"]');
  const savebar = form?.querySelector('.admin-savebar');
  if (!form || !savebar) return;

  const section = document.createElement('section');
  section.className = 'admin-panel';
  section.dataset.homeSectionEditor = '';
  section.innerHTML = `
    <div class="admin-panel-head"><div><p class="admin-eyebrow">HOME SECTIONS</p><h2>메인 섹션 문구</h2><p>첫 화면 아래의 브랜드 소개·시설·이용안내·예약 CTA 문구를 관리합니다.</p></div></div>
    <div class="admin-form-grid two">
      <label class="admin-field full"><span>A DAY AT RE:LIM 제목</span><textarea name="sectionDayTitle" rows="2" maxlength="160"></textarea></label>
      <label class="admin-field full"><span>A DAY AT RE:LIM 설명</span><textarea name="sectionDayDescription" rows="3" maxlength="500"></textarea></label>
      <label class="admin-field full"><span>브랜드 소개 제목</span><textarea name="sectionAboutTitle" rows="2" maxlength="180"></textarea></label>
      <label class="admin-field full"><span>브랜드 소개 설명</span><textarea name="sectionAboutDescription" rows="4" maxlength="900"></textarea></label>
      <label class="admin-field"><span>시설 소개 제목</span><input name="sectionFacilitiesTitle" maxlength="120"></label>
      <label class="admin-field"><span>예약 가이드 제목</span><input name="sectionQuickGuideTitle" maxlength="120"></label>
      <label class="admin-field full"><span>시설 소개 설명</span><textarea name="sectionFacilitiesDescription" rows="3" maxlength="600"></textarea></label>
      <label class="admin-field full"><span>예약 가이드 설명</span><textarea name="sectionQuickGuideDescription" rows="2" maxlength="400"></textarea></label>
      <label class="admin-field full"><span>하단 예약 CTA 제목</span><input name="sectionCtaTitle" maxlength="180"></label>
      <label class="admin-field"><span>하단 예약 버튼</span><input name="sectionCtaButtonLabel" maxlength="30"></label>
      <div class="admin-field" style="align-content:end"><button class="admin-button primary" type="button" data-home-sections-save>섹션 문구 저장</button></div>
    </div>
  `;
  form.insertBefore(section, savebar);
  section.querySelector('[data-home-sections-save]')?.addEventListener('click', saveHomeSections);
}

function fillHomepageSections(sections = {}) {
  const form = document.querySelector('[data-form="homepage"]');
  const values = { ...DEFAULT_SECTIONS, ...sections };
  const map = {
    sectionDayTitle: values.dayTitle,
    sectionDayDescription: values.dayDescription,
    sectionAboutTitle: values.aboutTitle,
    sectionAboutDescription: values.aboutDescription,
    sectionFacilitiesTitle: values.facilitiesTitle,
    sectionFacilitiesDescription: values.facilitiesDescription,
    sectionQuickGuideTitle: values.quickGuideTitle,
    sectionQuickGuideDescription: values.quickGuideDescription,
    sectionCtaTitle: values.ctaTitle,
    sectionCtaButtonLabel: values.ctaButtonLabel
  };
  Object.entries(map).forEach(([name, value]) => {
    if (form?.elements?.[name]) form.elements[name].value = value || '';
  });
}

async function saveHomeSections() {
  const form = document.querySelector('[data-form="homepage"]');
  const button = document.querySelector('[data-home-sections-save]');
  if (!form || !db || !currentUser) return;
  const payload = {
    dayTitle: String(form.elements.sectionDayTitle?.value || '').trim(),
    dayDescription: String(form.elements.sectionDayDescription?.value || '').trim(),
    aboutTitle: String(form.elements.sectionAboutTitle?.value || '').trim(),
    aboutDescription: String(form.elements.sectionAboutDescription?.value || '').trim(),
    facilitiesTitle: String(form.elements.sectionFacilitiesTitle?.value || '').trim(),
    facilitiesDescription: String(form.elements.sectionFacilitiesDescription?.value || '').trim(),
    quickGuideTitle: String(form.elements.sectionQuickGuideTitle?.value || '').trim(),
    quickGuideDescription: String(form.elements.sectionQuickGuideDescription?.value || '').trim(),
    ctaTitle: String(form.elements.sectionCtaTitle?.value || '').trim(),
    ctaButtonLabel: String(form.elements.sectionCtaButtonLabel?.value || '').trim()
  };
  if (button) button.disabled = true;
  try {
    await setDoc(doc(db, 'siteConfig', 'public'), {
      homeSections: payload,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email || ''
    }, { merge: true });
    showMiniToast('메인 섹션 문구를 저장했습니다. 설정을 동기화합니다.');
    window.setTimeout(() => window.location.reload(), 450);
  } catch (error) {
    console.error('[RE:LIM HOME SECTIONS]', error);
    showMiniToast('섹션 문구 저장에 실패했습니다. Firestore 규칙을 확인해 주세요.', true);
  } finally {
    if (button) button.disabled = false;
  }
}

function htmlToPlainText(html) {
  const source = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n');
  const div = document.createElement('div');
  div.innerHTML = source;
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

async function migrateLegacyFaqIfNeeded(config) {
  if (Array.isArray(config?.faqs) && config.faqs.length) return false;
  try {
    await import('./faq-data.js?v=20260911-cms-import1');
  } catch (error) {
    console.warn('[RE:LIM FAQ IMPORT LOAD]', error);
    return false;
  }
  if (!Array.isArray(window.RELIM_FAQ_DATA) || !window.RELIM_FAQ_DATA.length) return false;

  const faqs = window.RELIM_FAQ_DATA.map((item, index) => ({
    id: `legacy-${item.id || index + 1}`,
    category: String(item.category || '기타'),
    question: String(item.question || '').trim(),
    answer: htmlToPlainText(item.answer),
    keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : [],
    enabled: true
  }));

  await setDoc(doc(db, 'siteConfig', 'public'), {
    faqs,
    faqMigratedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: currentUser?.email || ''
  }, { merge: true });
  return true;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 3000;
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

  let blob = await canvasToBlob(canvas, 'image/webp', 0.84);
  let extension = 'webp';
  let contentType = 'image/webp';
  if (!blob) {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
    extension = 'jpg';
    contentType = 'image/jpeg';
  }
  if (!blob) throw new Error('이미지 변환에 실패했습니다.');
  return { blob, extension, contentType, width, height };
}

function bindOptimizedUpload() {
  const input = document.querySelector('[data-upload="hero"]');
  if (!input || input.dataset.optimizedUploadBound === 'true') return;
  input.dataset.optimizedUploadBound = 'true';
  const hint = input.closest('.admin-upload')?.querySelector('small');
  if (hint) hint.textContent = '업로드 시 최대 3000px · WEBP 자동 최적화';

  input.addEventListener('change', async (event) => {
    event.stopImmediatePropagation();
    const file = input.files?.[0];
    if (!file) return;
    const status = document.querySelector('[data-upload-status="hero"]');
    if (!file.type.startsWith('image/')) {
      if (status) status.textContent = '이미지 파일만 업로드할 수 있습니다.';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      if (status) status.textContent = '원본 이미지는 15MB 이하로 선택해 주세요.';
      return;
    }
    if (!storage || !currentUser) {
      if (status) status.textContent = 'Firebase Storage를 사용할 수 없습니다.';
      return;
    }

    input.disabled = true;
    if (status) status.textContent = '이미지를 최적화하고 있습니다...';
    try {
      const optimized = await optimizeImage(file);
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${optimized.extension}`;
      const target = storageRef(storage, `cms/home/${filename}`);
      if (status) status.textContent = `최적화 완료 (${optimized.width}×${optimized.height}). 업로드 중...`;
      await uploadBytes(target, optimized.blob, { contentType: optimized.contentType });
      const url = await getDownloadURL(target);
      const urlInput = document.querySelector('[data-form="homepage"]')?.elements?.heroImageUrl;
      if (urlInput) urlInput.value = url;
      const preview = document.querySelector('[data-preview="hero"]');
      if (preview) {
        const image = document.createElement('img');
        image.src = url;
        image.alt = '메인 대표 이미지 미리보기';
        preview.replaceChildren(image);
      }
      const kb = Math.round(optimized.blob.size / 1024);
      if (status) status.textContent = `업로드 완료 · 약 ${kb.toLocaleString('ko-KR')}KB. 홈페이지 저장 버튼을 눌러 적용해 주세요.`;
    } catch (error) {
      console.error('[RE:LIM OPTIMIZED UPLOAD]', error);
      if (status) status.textContent = '이미지 최적화 또는 업로드에 실패했습니다.';
    } finally {
      input.disabled = false;
      input.value = '';
    }
  }, true);
}

async function initializeForAdmin(user) {
  currentUser = user;
  injectHomepageSectionEditor();
  bindOptimizedUpload();
  try {
    const snapshot = await getDoc(doc(db, 'siteConfig', 'public'));
    const config = snapshot.exists() ? snapshot.data() : {};
    fillHomepageSections(config.homeSections || DEFAULT_SECTIONS);
    const migrated = await migrateLegacyFaqIfNeeded(config);
    if (migrated && sessionStorage.getItem('relim:faq:migrated-reload') !== '1') {
      sessionStorage.setItem('relim:faq:migrated-reload', '1');
      showMiniToast('기존 FAQ를 관리자 데이터로 이관했습니다. 목록을 동기화합니다.');
      window.setTimeout(() => window.location.reload(), 500);
    }
  } catch (error) {
    console.warn('[RE:LIM CMS ENHANCEMENTS]', error);
  }
}

if (auth && db) {
  onAuthStateChanged(auth, (user) => {
    if (user && isAdmin(user)) initializeForAdmin(user);
  });
}
