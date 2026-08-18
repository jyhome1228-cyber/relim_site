import('./member-sync.js').catch((error) => console.error('[RE:LIM MEMBER SYNC]', error));
import('./traffic.js').catch((error) => console.warn('[RE:LIM TRAFFIC LOAD]', error));
import('./motion.js?v=20260812-ops2').catch((error) => console.warn('[RE:LIM MOTION LOAD]', error));
import('./home-signup-banner.js?v=20260813-mobilefix1').catch((error) => console.warn('[RE:LIM ANNOUNCEMENT BANNER]', error));

if (document.querySelector('[data-reviews-page]')) {
  import('./collected-reviews.js?v=20260812-1').catch((error) => console.warn('[RE:LIM COLLECTED REVIEWS]', error));
}

const GA_MEASUREMENT_ID = 'G-EL627CS50V';
const RESERVATION_URL = 'https://camfit.co.kr/camp/6a6b276b521182001db33430?keyword=%EB%A6%AC%EB%A6%BC&adultCnt=2';

function initGoogleAnalytics() {
  const existingLoader = [...document.scripts].find((script) =>
    script.src.includes(`googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`)
  );

  if (existingLoader && typeof window.gtag === 'function') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  if (!existingLoader) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    gaScript.dataset.relimGa = GA_MEASUREMENT_ID;
    document.head.append(gaScript);
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
}

initGoogleAnalytics();

const NAV_STYLE_VERSION = '20260813-mobilefix1';
const TITLE_STYLE_VERSION = '20260810-1439';
const TYPOGRAPHY_STYLE_VERSION = '20260810-1439';

const RELIM_BUSINESS = {
  company: '(주)나인힐스',
  representative: '남현승',
  businessNumber: '220-86-50466',
  tourismNumber: '제2015-000014호',
  address: '경기 용인시 처인구 원삼면 보개원삼로1372번길 41 나인힐스',
  email: 'penury@naver.com'
};

function normalizeReservationLinks() {
  document.querySelectorAll('.header-book, a[href*="camfit.co.kr/camp/"]').forEach((link) => {
    link.href = RESERVATION_URL;
    link.target = '_blank';
    link.rel = 'noopener';
  });
}

function ensureNavStyles() {
  if (!document.querySelector('[data-relim-typography-style]')) {
    const typographyLink = document.createElement('link');
    typographyLink.rel = 'stylesheet';
    typographyLink.href = `assets/css/typography-global.css?v=${TYPOGRAPHY_STYLE_VERSION}`;
    typographyLink.dataset.relimTypographyStyle = '';
    document.head.append(typographyLink);
  }

  if (!document.querySelector('[data-relim-nav-style]')) {
    const navLink = document.createElement('link');
    navLink.rel = 'stylesheet';
    navLink.href = `assets/css/nav-dropdown.css?v=${NAV_STYLE_VERSION}`;
    navLink.dataset.relimNavStyle = '';
    document.head.append(navLink);
  }

  if (!document.querySelector('[data-relim-title-style]')) {
    const titleLink = document.createElement('link');
    titleLink.rel = 'stylesheet';
    titleLink.href = `assets/css/title-scale.css?v=${TITLE_STYLE_VERSION}`;
    titleLink.dataset.relimTitleStyle = '';
    document.head.append(titleLink);
  }
}

function createNavLink(label, href, className = '') {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  if (className) link.className = className;
  return link;
}

function ensureFooterBusinessInfo() {
  document.querySelectorAll('.site-footer').forEach((footer) => {
    if (!footer.querySelector('.footer-business-info')) {
      const businessInfo = document.createElement('div');
      businessInfo.className = 'container footer-business-info';
      businessInfo.innerHTML = `
        <span><b>상호명</b>${RELIM_BUSINESS.company}</span>
        <span><b>대표자</b>${RELIM_BUSINESS.representative}</span>
        <span><b>사업자등록번호</b>${RELIM_BUSINESS.businessNumber}</span>
        <span><b>관광사업(야영장) 등록번호</b>${RELIM_BUSINESS.tourismNumber}</span>
        <span><b>사업자 주소</b>${RELIM_BUSINESS.address}</span>
        <span><b>이메일</b><a href="mailto:${RELIM_BUSINESS.email}">${RELIM_BUSINESS.email}</a></span>
      `;
      const footerBottom = footer.querySelector('.footer-bottom');
      if (footerBottom) footer.insertBefore(businessInfo, footerBottom);
      else footer.append(businessInfo);
    }

    const addressHeading = footer.querySelector('.footer-main > div:last-child h3');
    if (addressHeading && addressHeading.textContent.trim() === '주소') {
      addressHeading.textContent = '오시는 길';
    }
  });
}

function ensureFooterLegalLinks() {
  document.querySelectorAll('.footer-bottom').forEach((footerBottom) => {
    if (footerBottom.querySelector('.footer-policy-links')) return;
    const group = document.createElement('span');
    group.className = 'footer-policy-links';
    group.append(
      createNavLink('이용약관', 'terms.html'),
      createNavLink('개인정보 처리방침', 'privacy.html')
    );
    footerBottom.append(group);
  });
}

function createMobileActions(nav) {
  const actions = document.createElement('div');
  actions.className = 'nav-mobile-actions';
  actions.setAttribute('aria-label', '예약 메뉴');
  actions.style.gridTemplateColumns = '1fr';

  const reservation = document.createElement('a');
  reservation.className = 'nav-mobile-reservation';
  reservation.href = RESERVATION_URL;
  reservation.target = '_blank';
  reservation.rel = 'noopener';
  reservation.innerHTML = '<span>예약하기</span><span aria-hidden="true">↗</span>';

  actions.append(reservation);
  nav.append(actions);

  const sync = () => {
    reservation.href = RESERVATION_URL;
    reservation.target = '_blank';
    reservation.rel = 'noopener';
  };

  sync();
  return { actions, sync };
}

function initRelimNavigation() {
  normalizeReservationLinks();
  ensureNavStyles();
  ensureFooterBusinessInfo();
  ensureFooterLegalLinks();

  const nav = document.querySelector('.nav');
  const menuButton = document.querySelector('.menu-toggle');
  if (!nav || nav.dataset.relimNavReady === 'true') return;

  nav.dataset.relimNavReady = 'true';
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const about = createNavLink('리림 소개', 'about.html');
  const gallery = createNavLink('갤러리', 'gallery.html');
  const faq = createNavLink('자주 묻는 질문', 'faq.html');
  const reviews = createNavLink('리뷰', 'reviews.html');
  const inquiry = createNavLink('문의하기', 'inquiry.html');
  const location = createNavLink('오시는 길', 'location.html', 'nav-location');

  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';

  const dropdownButton = document.createElement('button');
  dropdownButton.type = 'button';
  dropdownButton.className = 'nav-dropdown-toggle';
  dropdownButton.setAttribute('aria-expanded', 'false');
  dropdownButton.innerHTML = '<span>안내</span><span class="nav-dropdown-arrow" aria-hidden="true"></span>';

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'nav-dropdown-menu';
  dropdownMenu.setAttribute('aria-label', '안내 메뉴');

  const guideLinks = [
    createNavLink('공간 안내', 'space.html'),
    createNavLink('이용 안내', 'guide.html'),
    createNavLink('예약 안내', 'reservation.html')
  ];
  guideLinks.forEach((link) => dropdownMenu.append(link));
  dropdown.append(dropdownButton, dropdownMenu);

  nav.replaceChildren(about, dropdown, gallery, faq, reviews, inquiry, location);
  const mobileActions = createMobileActions(nav);

  const allLinks = [...nav.querySelectorAll('a')];
  allLinks.forEach((link) => {
    if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  });

  if (guideLinks.some((link) => link.getAttribute('href') === currentPage)) {
    dropdownButton.classList.add('is-current');
    dropdownButton.setAttribute('aria-current', 'page');
  }

  const setDropdown = (open) => {
    dropdown.classList.toggle('is-open', open);
    dropdownButton.setAttribute('aria-expanded', String(open));
  };

  const syncMobileOpenState = () => {
    if (!menuButton) return;
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    document.body.classList.toggle('mobile-nav-open', open && window.matchMedia('(max-width: 900px)').matches);
    if (open) mobileActions.sync();
  };

  menuButton?.addEventListener('click', () => {
    window.requestAnimationFrame(syncMobileOpenState);
  });

  dropdownButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setDropdown(!dropdown.classList.contains('is-open'));
  });

  dropdown.addEventListener('mouseenter', () => {
    if (window.matchMedia('(min-width: 901px)').matches) setDropdown(true);
  });
  dropdown.addEventListener('mouseleave', () => {
    if (window.matchMedia('(min-width: 901px)').matches) setDropdown(false);
  });

  allLinks.forEach((link) => {
    link.addEventListener('click', () => {
      setDropdown(false);
      if (window.matchMedia('(max-width: 900px)').matches) {
        nav.classList.remove('is-open');
        menuButton?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-nav-open');
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) setDropdown(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setDropdown(false);
    dropdownButton.blur();
    if (window.matchMedia('(max-width: 900px)').matches) {
      nav.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-nav-open');
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      nav.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-nav-open');
      setDropdown(false);
    }
  }, { passive: true });
}

initRelimNavigation();

/* Brand naming normalization: display every '용인 리림' occurrence simply as '리림'. */
const RELIM_NAME_FROM = '용인 리림';
const RELIM_NAME_TO = '리림';
const replaceRelimName = (value) => typeof value === 'string'
  ? value.split(RELIM_NAME_FROM).join(RELIM_NAME_TO)
  : value;

function normalizeRelimNaming(root = document) {
  if (!root) return;

  document.title = replaceRelimName(document.title);

  document.querySelectorAll('meta[content]').forEach((meta) => {
    const current = meta.getAttribute('content');
    const next = replaceRelimName(current);
    if (next !== current) meta.setAttribute('content', next);
  });

  document.querySelectorAll('[alt],[title],[aria-label],[placeholder]').forEach((element) => {
    ['alt', 'title', 'aria-label', 'placeholder'].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const current = element.getAttribute(attribute);
      const next = replaceRelimName(current);
      if (next !== current) element.setAttribute(attribute, next);
    });
  });

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    const next = replaceRelimName(script.textContent);
    if (next !== script.textContent) script.textContent = next;
  });

  const walker = document.createTreeWalker(
    root === document ? document.body : root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue?.includes(RELIM_NAME_FROM)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const targets = [];
  while (walker.nextNode()) targets.push(walker.currentNode);
  targets.forEach((node) => {
    node.nodeValue = replaceRelimName(node.nodeValue);
  });
}

normalizeRelimNaming();

const relimNamingObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'characterData') {
      const node = mutation.target;
      if (node.nodeValue?.includes(RELIM_NAME_FROM)) node.nodeValue = replaceRelimName(node.nodeValue);
      return;
    }

    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue?.includes(RELIM_NAME_FROM)) node.nodeValue = replaceRelimName(node.nodeValue);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        normalizeRelimNaming(node);
      }
    });
  });
});

if (document.body) {
  relimNamingObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}
