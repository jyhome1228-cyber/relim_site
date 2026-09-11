import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const REVIEW_PAGE = 'reviews.html';
const ANNOUNCEMENT_STORAGE_KEY = 'relim-reservation-banner-dismissed-date';

function stripReviewUI(root = document) {
  root.querySelectorAll?.('a[href*="reviews.html"], a[href*="review.html"]').forEach((link) => link.remove());
  root.querySelectorAll?.('[data-review-entry], [data-review-link]').forEach((element) => element.remove());
}

stripReviewUI();
if (currentPage === REVIEW_PAGE) {
  window.location.replace('inquiry.html');
}

const reviewObserver = new MutationObserver(() => stripReviewUI());
if (document.documentElement) reviewObserver.observe(document.documentElement, { childList: true, subtree: true });
window.setTimeout(() => reviewObserver.disconnect(), 5000);

if (!firebaseReady) {
  console.warn('[RE:LIM CMS] Firebase config is not ready.');
} else {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getFirestore(app);
  getDoc(doc(db, 'siteConfig', 'public'))
    .then((snapshot) => {
      if (!snapshot.exists()) return;
      applyConfig(snapshot.data());
    })
    .catch((error) => console.warn('[RE:LIM CMS CONFIG]', error));
}

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function setText(selector, value) {
  if (!clean(value)) return;
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function setMeta(selector, value) {
  if (!clean(value)) return;
  document.querySelectorAll(selector).forEach((element) => element.setAttribute('content', value));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInRange(startDate, endDate) {
  const today = localDateKey();
  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;
  return true;
}

function replaceVisibleText(replacements) {
  if (!document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let value = node.nodeValue;
    let next = value;
    replacements.forEach(([from, to]) => {
      if (from && to && next.includes(from)) next = next.split(from).join(to);
    });
    if (next !== value) node.nodeValue = next;
  });
}

function normalizeTel(phone) {
  return String(phone || '').replace(/[^0-9+]/g, '');
}

function applyGlobalLinks(config) {
  const operation = config.operation || {};
  const links = config.links || {};
  const reservationUrl = clean(operation.reservationUrl);
  const reservationLabel = clean(operation.reservationButtonLabel || config.home?.reservationLabel, '예약하기');

  if (reservationUrl) {
    document.querySelectorAll('.header-book, .nav-mobile-reservation, a[href*="camfit.co.kr/camp/"]').forEach((link) => {
      link.href = reservationUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      if (link.classList.contains('header-book')) link.textContent = reservationLabel;
      const label = link.querySelector('span:first-child');
      if (link.classList.contains('nav-mobile-reservation') && label) label.textContent = reservationLabel;
    });
  }

  if (operation.reservationStatus === 'paused') {
    document.querySelectorAll('.header-book, .nav-mobile-reservation, a[href*="camfit.co.kr/camp/"]').forEach((link) => {
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.setAttribute('aria-disabled', 'true');
      link.classList.add('is-disabled');
      if (link.classList.contains('header-book')) link.textContent = '예약 일시 중단';
    });
  }

  const phone = clean(operation.phone);
  if (phone) {
    const tel = normalizeTel(phone);
    document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
      link.href = `tel:${tel}`;
      link.textContent = link.textContent.replace(/0\d{1,2}-\d{3,4}-\d{4}/g, phone);
    });
  }

  if (clean(links.instagram)) {
    document.querySelectorAll('a[href*="instagram.com"]').forEach((link) => {
      link.href = links.instagram;
      link.target = '_blank';
      link.rel = 'noopener';
    });
  }

  if (clean(links.naverMap)) {
    document.querySelectorAll('a[href*="map.naver.com"]').forEach((link) => {
      link.href = links.naverMap;
      link.target = '_blank';
      link.rel = 'noopener';
    });
  }
}

function applyHome(config) {
  if (currentPage !== 'index.html' && window.location.pathname !== '/') return;
  const home = config.home || {};
  const hero = document.querySelector('.home-focus-hero');
  if (!hero) return;

  const eyebrow = hero.querySelector('.home-focus-inner .eyebrow');
  const title = hero.querySelector('h1');
  const description = hero.querySelector('.home-focus-description');
  const primary = hero.querySelector('.home-focus-button, .home-focus-actions .button');
  const secondary = hero.querySelector('.home-focus-link');
  if (eyebrow && clean(home.eyebrow)) eyebrow.textContent = home.eyebrow;
  if (title && clean(home.title)) title.textContent = home.title;
  if (description && clean(home.description)) description.textContent = home.description;
  if (primary && clean(home.reservationLabel)) primary.textContent = home.reservationLabel;
  if (secondary && clean(home.aboutLabel)) secondary.textContent = home.aboutLabel;

  if (clean(home.heroImageUrl)) {
    const firstImage = hero.querySelector('.home-focus-slide img');
    if (firstImage) firstImage.src = home.heroImageUrl;
  }
}

function applyOperation(config) {
  const operation = config.operation || {};
  const replacements = [
    ['10:00 ~ 15:00', clean(operation.morningHours)],
    ['10:00~15:00', clean(operation.morningHours)],
    ['16:00 ~ 21:00', clean(operation.afternoonHours)],
    ['16:00~21:00', clean(operation.afternoonHours)],
    ['25,000원', clean(operation.basePrice)],
    ['150,000원', clean(operation.shelterPrice)],
    ['최대 10인', operation.maxPeople ? `최대 ${operation.maxPeople}` : ''],
    ['10인', clean(operation.maxPeople)]
  ].filter(([, to]) => to);
  replaceVisibleText(replacements);

  if (clean(operation.address)) {
    replaceVisibleText([
      ['경기도 용인시 처인구 원삼면\n보개원삼로1372번길 45', operation.address],
      ['경기도 용인시 처인구 원삼면 보개원삼로1372번길 45', operation.address]
    ]);
  }
}

function applySeo(config) {
  const seo = config.seo || {};
  if (clean(seo.title)) {
    document.title = seo.title;
    setMeta('meta[property="og:title"], meta[name="twitter:title"]', seo.title);
  }
  setMeta('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]', seo.description);
  setMeta('meta[name="keywords"]', seo.keywords);
  setMeta('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]', seo.ogImage);
}

function updateFooterBusiness(config) {
  const business = config.business || {};
  const operation = config.operation || {};
  const mapping = {
    '상호명': business.company,
    '대표자': business.representative,
    '사업자등록번호': business.businessNumber,
    '관광사업(야영장) 등록번호': business.tourismNumber,
    '사업자 주소': business.address,
    '이메일': business.email
  };

  document.querySelectorAll('.footer-business-info span').forEach((row) => {
    const label = row.querySelector('b')?.textContent.trim();
    if (!label || !clean(mapping[label])) return;
    const b = row.querySelector('b');
    row.replaceChildren(b);
    if (label === '이메일') {
      const link = document.createElement('a');
      link.href = `mailto:${mapping[label]}`;
      link.textContent = mapping[label];
      row.append(link);
    } else {
      row.append(document.createTextNode(mapping[label]));
    }
  });

  if (clean(operation.address)) {
    document.querySelectorAll('.site-footer .footer-main > div:last-child p').forEach((element) => {
      element.textContent = operation.address;
    });
  }

  const policyGroup = document.querySelector('.footer-policy-links');
  if (policyGroup && !policyGroup.querySelector('a[href="notice.html"]')) {
    const link = document.createElement('a');
    link.href = 'notice.html';
    link.textContent = '공지사항';
    policyGroup.prepend(link);
  }
}

function announcementDismissedToday() {
  try { return localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) === localDateKey(); }
  catch { return false; }
}

function saveAnnouncementDismissed() {
  try { localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, localDateKey()); }
  catch {}
}

function clearAnnouncementLayout() {
  document.body.classList.remove('relim-announcement-visible');
  document.documentElement.style.removeProperty('--relim-announcement-height');
}

function applyAnnouncement(config) {
  const announcement = config.announcement || {};
  const active = announcement.enabled !== false && dateInRange(announcement.startDate, announcement.endDate);
  let banner = document.querySelector('[data-home-signup-banner]');

  if (!active) {
    banner?.remove();
    clearAnnouncementLayout();
    return;
  }
  if (announcementDismissedToday()) return;

  if (!banner) {
    if (!document.querySelector('[data-home-signup-banner-style]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = 'assets/css/home-signup-banner.css?v=20260813-mobilefix1';
      style.dataset.homeSignupBannerStyle = '';
      document.head.append(style);
    }
    banner = document.createElement('aside');
    banner.className = 'home-signup-banner';
    banner.dataset.homeSignupBanner = '';
    banner.setAttribute('aria-label', '리림 안내');
    banner.innerHTML = `
      <div class="home-signup-banner__inner">
        <p class="home-signup-banner__copy"><strong></strong><span></span></p>
        <div class="home-signup-banner__actions">
          <a class="home-signup-banner__cta" target="_blank" rel="noopener"></a>
          <button class="home-signup-banner__dismiss" type="button" data-banner-dismiss>오늘은 다시 보지 않기 <span aria-hidden="true">×</span></button>
        </div>
      </div>`;
    const header = document.querySelector('.site-header');
    if (header) header.before(banner); else document.body.prepend(banner);
  }

  const title = banner.querySelector('.home-signup-banner__copy strong');
  const copy = banner.querySelector('.home-signup-banner__copy span');
  const cta = banner.querySelector('.home-signup-banner__cta');
  if (title) title.textContent = clean(announcement.title, 'RE:LIM NOTICE');
  if (copy) copy.textContent = clean(announcement.text);
  if (cta) {
    cta.textContent = clean(announcement.button, '자세히 보기');
    cta.href = clean(announcement.url, config.operation?.reservationUrl || '#');
  }

  const syncHeight = () => {
    if (!banner?.isConnected) return;
    document.documentElement.style.setProperty('--relim-announcement-height', `${Math.ceil(banner.getBoundingClientRect().height)}px`);
    document.body.classList.add('relim-announcement-visible');
  };
  banner.querySelector('[data-banner-dismiss]')?.addEventListener('click', () => {
    saveAnnouncementDismissed();
    banner.remove();
    clearAnnouncementLayout();
  }, { once: true });
  requestAnimationFrame(syncHeight);
}

function bindFaqApp(config) {
  if (currentPage !== 'faq.html') return;
  const source = Array.isArray(config.faqs) ? config.faqs.filter((item) => item.enabled !== false) : [];
  if (!source.length) return;

  const oldApp = document.querySelector('[data-faq-app]');
  if (!oldApp) return;
  const app = oldApp.cloneNode(true);
  oldApp.replaceWith(app);

  const searchInput = app.querySelector('#faqSearch');
  const clearButton = app.querySelector('#faqClear');
  const resetButton = app.querySelector('#faqReset');
  const emptyResetButton = app.querySelector('#faqEmptyReset');
  const categoriesElement = app.querySelector('#faqCategories');
  const keywordsElement = app.querySelector('#faqPopularKeywords');
  const resultSummary = app.querySelector('#faqResultSummary');
  const listElement = app.querySelector('#faqList');
  const emptyElement = app.querySelector('#faqEmpty');
  if (!searchInput || !categoriesElement || !resultSummary || !listElement || !emptyElement) return;

  categoriesElement.replaceChildren();
  keywordsElement?.replaceChildren();
  listElement.replaceChildren();
  const categories = ['전체', ...new Set(source.map((item) => clean(item.category, '기타')))];
  const popularKeywords = [...new Set(source.flatMap((item) => Array.isArray(item.keywords) ? item.keywords : []))].slice(0, 8);
  let activeCategory = '전체';
  let query = '';

  const normalize = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\-_/.,()[\]{}·~:;!?\'"“”‘’+]+/g, '');
  const filtered = () => source.filter((item) => {
    if (activeCategory !== '전체' && clean(item.category, '기타') !== activeCategory) return false;
    const token = normalize(query);
    if (!token) return true;
    return [item.question, item.answer, item.category, ...(item.keywords || [])].some((value) => normalize(value).includes(token));
  });

  const makeItem = (item, index) => {
    const article = document.createElement('article');
    article.className = 'faq-item';
    const button = document.createElement('button');
    button.className = 'faq-question';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    const answerId = `cms-faq-answer-${index}`;
    button.setAttribute('aria-controls', answerId);
    const no = document.createElement('span'); no.className = 'faq-index'; no.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span'); copy.className = 'faq-question-copy';
    const category = document.createElement('span'); category.className = 'faq-item-category'; category.textContent = clean(item.category, '기타');
    const title = document.createElement('span'); title.className = 'faq-question-title'; title.textContent = clean(item.question);
    const icon = document.createElement('span'); icon.className = 'icon'; icon.setAttribute('aria-hidden', 'true');
    copy.append(category, title); button.append(no, copy, icon);
    const answer = document.createElement('div'); answer.className = 'faq-answer'; answer.id = answerId;
    const answerInner = document.createElement('div'); answerInner.className = 'faq-answer-inner'; answerInner.textContent = clean(item.answer); answerInner.style.whiteSpace = 'pre-line';
    answer.append(answerInner);
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      listElement.querySelectorAll('.faq-question').forEach((itemButton) => itemButton.setAttribute('aria-expanded', 'false'));
      listElement.querySelectorAll('.faq-answer').forEach((itemAnswer) => itemAnswer.classList.remove('is-open'));
      if (!open) { button.setAttribute('aria-expanded', 'true'); answer.classList.add('is-open'); }
    });
    article.append(button, answer);
    return article;
  };

  const render = () => {
    const results = filtered();
    listElement.replaceChildren(...results.map(makeItem));
    listElement.hidden = results.length === 0;
    emptyElement.hidden = results.length > 0;
    resultSummary.textContent = `${query ? `‘${query}’ 검색 결과` : activeCategory} ${results.length}개`;
    if (clearButton) clearButton.hidden = !query;
    categoriesElement.querySelectorAll('.faq-category').forEach((button) => button.classList.toggle('is-active', button.dataset.category === activeCategory));
  };

  categories.forEach((name) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'faq-category'; button.dataset.category = name; button.textContent = name;
    button.addEventListener('click', () => { activeCategory = name; render(); });
    categoriesElement.append(button);
  });
  popularKeywords.forEach((keyword) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'faq-keyword'; button.textContent = `#${keyword}`;
    button.addEventListener('click', () => { activeCategory = '전체'; query = keyword; searchInput.value = keyword; render(); });
    keywordsElement?.append(button);
  });
  searchInput.addEventListener('input', () => { query = searchInput.value.trim(); render(); });
  clearButton?.addEventListener('click', () => { query = ''; searchInput.value = ''; render(); searchInput.focus(); });
  const reset = () => { activeCategory = '전체'; query = ''; searchInput.value = ''; render(); };
  resetButton?.addEventListener('click', reset);
  emptyResetButton?.addEventListener('click', reset);
  render();
}

function renderNoticePage(config) {
  const root = document.querySelector('[data-notice-list]');
  if (!root) return;
  const today = localDateKey();
  const notices = (Array.isArray(config.notices) ? config.notices : [])
    .filter((item) => item.enabled !== false)
    .filter((item) => (!item.startDate || today >= item.startDate) && (!item.endDate || today <= item.endDate))
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
    });
  root.replaceChildren();
  notices.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'notice-item';
    const header = document.createElement('button');
    header.className = 'notice-question'; header.type = 'button'; header.setAttribute('aria-expanded', 'false');
    const no = document.createElement('span'); no.className = 'notice-index'; no.textContent = item.pinned ? 'PIN' : String(index + 1).padStart(2, '0');
    const copy = document.createElement('span'); copy.className = 'notice-title-wrap';
    const title = document.createElement('strong'); title.textContent = item.title || '공지사항';
    const date = document.createElement('small'); date.textContent = (item.updatedAt || item.createdAt || '').slice(0, 10);
    copy.append(title, date);
    const icon = document.createElement('span'); icon.className = 'notice-icon'; icon.textContent = '+';
    header.append(no, copy, icon);
    const body = document.createElement('div'); body.className = 'notice-answer';
    const bodyInner = document.createElement('div'); bodyInner.className = 'notice-answer-inner'; bodyInner.textContent = item.content || ''; bodyInner.style.whiteSpace = 'pre-line';
    body.append(bodyInner);
    header.addEventListener('click', () => {
      const open = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!open));
      body.classList.toggle('is-open', !open);
      icon.textContent = open ? '+' : '−';
    });
    article.append(header, body); root.append(article);
  });
  const empty = document.querySelector('[data-notice-page-empty]');
  if (empty) empty.hidden = notices.length > 0;
}

function applyConfig(config) {
  stripReviewUI();
  applySeo(config);
  applyGlobalLinks(config);
  applyHome(config);
  applyOperation(config);
  applyAnnouncement(config);
  bindFaqApp(config);
  renderNoticePage(config);
  updateFooterBusiness(config);

  window.setTimeout(() => {
    stripReviewUI();
    applyGlobalLinks(config);
    updateFooterBusiness(config);
    applyAnnouncement(config);
  }, 350);
  window.setTimeout(() => {
    stripReviewUI();
    applyGlobalLinks(config);
    updateFooterBusiness(config);
  }, 1200);
}
