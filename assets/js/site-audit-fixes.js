import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

function injectImmediateCleanupStyle() {
  if (document.querySelector('[data-relim-review-cleanup-style]')) return;
  const style = document.createElement('style');
  style.dataset.relimReviewCleanupStyle = '';
  style.textContent = 'a[href*="reviews.html"],a[href*="review.html"]{display:none!important}';
  document.head.append(style);
}

injectImmediateCleanupStyle();

function stripReviewUi() {
  document.querySelectorAll('a[href*="reviews.html"],a[href*="review.html"],[data-review-entry],[data-review-link]').forEach((element) => element.remove());
}

function ensureNoticeLink() {
  const dropdown = document.querySelector('.nav-dropdown-menu');
  if (!dropdown || dropdown.querySelector('a[href="notice.html"]')) return;
  const link = document.createElement('a');
  link.href = 'notice.html';
  link.textContent = '공지사항';
  dropdown.append(link);
}

function setMultiline(element, value) {
  if (!element || !String(value || '').trim()) return;
  const lines = String(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  element.replaceChildren();
  lines.forEach((line, index) => {
    if (index) element.append(document.createElement('br'));
    element.append(document.createTextNode(line));
  });
}

function findSectionByEyebrow(label) {
  return [...document.querySelectorAll('main.page > section.section')].find((section) => {
    const eyebrow = section.querySelector('.section-intro .eyebrow,.quick-guide-head .eyebrow');
    return eyebrow?.textContent.trim().toLowerCase() === label.toLowerCase();
  });
}

function applyHomeSections(config) {
  const sections = config?.homeSections;
  if (!sections) return;
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage !== 'index.html' && window.location.pathname !== '/') return;

  const day = document.querySelector('.home-gallery-intro');
  if (day) {
    setMultiline(day.querySelector('h2'), sections.dayTitle);
    if (sections.dayDescription && day.querySelector('p:last-child')) day.querySelector('p:last-child').textContent = sections.dayDescription;
  }

  const about = findSectionByEyebrow('About RE:LIM');
  if (about) {
    setMultiline(about.querySelector('.copy h2'), sections.aboutTitle);
    if (sections.aboutDescription && about.querySelector('.copy .lead')) about.querySelector('.copy .lead').textContent = sections.aboutDescription;
  }

  const facilities = findSectionByEyebrow('Facilities');
  if (facilities) {
    if (sections.facilitiesTitle && facilities.querySelector('.copy h2')) facilities.querySelector('.copy h2').textContent = sections.facilitiesTitle;
    if (sections.facilitiesDescription && facilities.querySelector('.copy p')) facilities.querySelector('.copy p').textContent = sections.facilitiesDescription;
  }

  const quickGuide = document.querySelector('.quick-guide');
  if (quickGuide) {
    if (sections.quickGuideTitle && quickGuide.querySelector('.quick-guide-head h2')) quickGuide.querySelector('.quick-guide-head h2').textContent = sections.quickGuideTitle;
    const description = quickGuide.querySelector('.quick-guide-head > div > p');
    if (sections.quickGuideDescription && description) description.textContent = sections.quickGuideDescription;
  }

  const cta = document.querySelector('.cta-band');
  if (cta) {
    if (sections.ctaTitle && cta.querySelector('h2')) cta.querySelector('h2').textContent = sections.ctaTitle;
    const button = cta.querySelector('.button');
    if (button && sections.ctaButtonLabel) button.textContent = `${sections.ctaButtonLabel} ↗`;
  }
}

function applyReservationConfig(config) {
  const operation = config?.operation || {};
  const url = String(operation.reservationUrl || '').trim();
  const label = String(operation.reservationButtonLabel || config?.home?.reservationLabel || '예약하기').trim();
  const paused = operation.reservationStatus === 'paused';

  const sync = () => {
    document.querySelectorAll('.header-book,.nav-mobile-reservation,a[href*="camfit.co.kr/camp/"]').forEach((link) => {
      if (paused) {
        link.removeAttribute('href');
        link.removeAttribute('target');
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('is-disabled');
        if (link.classList.contains('header-book')) link.textContent = '예약 일시 중단';
        return;
      }
      if (url) link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.removeAttribute('aria-disabled');
      link.classList.remove('is-disabled');
      if (link.classList.contains('header-book')) link.textContent = label;
      if (link.classList.contains('nav-mobile-reservation')) {
        const text = link.querySelector('span:first-child');
        if (text) text.textContent = label;
      }
    });
  };

  sync();
  document.querySelector('.menu-toggle')?.addEventListener('click', () => window.requestAnimationFrame(sync));
}

async function loadConfig() {
  if (!firebaseReady) return null;
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getFirestore(app);
  try {
    const snapshot = await getDoc(doc(db, 'siteConfig', 'public'));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn('[RE:LIM SITE AUDIT CONFIG]', error);
    return null;
  }
}

async function init() {
  stripReviewUi();
  ensureNoticeLink();
  const config = await loadConfig();
  if (config) {
    applyHomeSections(config);
    applyReservationConfig(config);
  }

  [100, 450, 1400].forEach((delay) => {
    window.setTimeout(() => {
      stripReviewUi();
      ensureNoticeLink();
      if (config) applyReservationConfig(config);
    }, delay);
  });
}

init();
