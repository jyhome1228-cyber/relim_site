const MOTION_STYLE_VERSION = '20260811-2';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function ensureMotionStyles() {
  const existing = document.querySelector('[data-relim-motion-style]');
  if (existing) {
    if (existing.sheet) return Promise.resolve();
    return new Promise((resolve) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', resolve, { once: true });
      window.setTimeout(resolve, 1200);
    });
  }

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `assets/css/motion.css?v=${MOTION_STYLE_VERSION}`;
    link.dataset.relimMotionStyle = '';
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
    document.head.append(link);
    window.setTimeout(resolve, 1200);
  });
}

function isHomePage() {
  const page = window.location.pathname.split('/').pop();
  return !page || page === 'index.html';
}

function markRevealTargets() {
  const selectors = [
    '.home-focus-inner > *',
    '.home-gallery-intro-inner > *',
    '.home-gallery-hero',
    '.page-hero > .container > *',
    '.section-intro > *',
    '.image-wide',
    '.cards > *',
    '.quick-guide-head > *',
    '.experience-grid > *',
    '.about-section-intro > *',
    '.brand-journey-cards > *',
    '.about-scenes-grid > *',
    '.space-guide > *',
    '.space-photo-head > *',
    '.space-photo-gallery > *',
    '.room-section-head > *',
    '.room-grid > *',
    '.product-grid > *',
    '.info-grid > *',
    '.gallery-grid > *',
    '.faq-item',
    '.location-overview .split > *',
    '.cta-band .container > *',
    '.footer-main > *'
  ];

  const seen = new Set();
  const targets = [];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (seen.has(element)) return;
      if (element.closest('.room-modal, .lightbox')) return;
      seen.add(element);
      element.dataset.relimReveal = '';
      targets.push(element);
    });
  });

  targets.forEach((element, index) => {
    const delay = Math.min((index % 4) * 55, 165);
    element.style.setProperty('--relim-reveal-delay', `${delay}ms`);
  });

  return targets;
}

function initRevealMotion() {
  const targets = markRevealTargets();
  if (!targets.length) return;

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach((element) => element.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08
  });

  targets.forEach((element) => observer.observe(element));
}

function isEligiblePageLink(link, event) {
  if (!link || event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return false;
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

  let url;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
  return true;
}

function initPageTransitions() {
  if (reducedMotion.matches) return;

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!isEligiblePageLink(link, event)) return;

    event.preventDefault();
    document.documentElement.classList.add('motion-leaving');
    window.setTimeout(() => {
      window.location.href = link.href;
    }, 245);
  });

  window.addEventListener('pageshow', () => {
    document.documentElement.classList.remove('motion-leaving');
  });
}

async function initMotionSystem() {
  await ensureMotionStyles();

  document.documentElement.classList.add('motion-enabled');
  if (isHomePage()) document.documentElement.classList.add('home-motion');

  initRevealMotion();
  initPageTransitions();

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.add('motion-loaded');
    });
  });
}

initMotionSystem();
