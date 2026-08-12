import('./nav.js?v=20260812-banner2').catch((error) => console.error('[RE:LIM NAV]', error));

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

function initMemberNavigation() {
  const header = document.querySelector('.header-inner');
  const bookLink = header?.querySelector('.header-book');
  if (!header || !bookLink || header.querySelector('[data-auth-nav]')) return;

  const memberLink = document.createElement('a');
  memberLink.className = 'member-nav-link header-book';
  memberLink.href = 'login.html';
  memberLink.dataset.authNav = '';
  memberLink.textContent = '로그인';
  memberLink.setAttribute('aria-label', '로그인 및 회원가입');
  header.insertBefore(memberLink, bookLink);

  import('./auth.js')
    .then(({ initAuthNavigation }) => initAuthNavigation(memberLink))
    .catch(() => {
      memberLink.textContent = '로그인';
    });
}

initMemberNavigation();

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

const slides = [...document.querySelectorAll('.hero-slide')];
const dots = [...document.querySelectorAll('.hero-dot')];
let currentSlide = 0;

function showSlide(index) {
  slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  currentSlide = index;
}

if (slides.length) {
  dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
  setInterval(() => showSlide((currentSlide + 1) % slides.length), 5200);
}

function initSiteMap() {
  const map = document.querySelector('[data-site-map]');
  if (!map) return;

  const hotspots = [...map.querySelectorAll('.site-hotspot')];
  const numberElement = map.querySelector('[data-site-number]');
  const titleElement = map.querySelector('[data-site-title]');
  const descriptionElement = map.querySelector('[data-site-description]');
  const rangeButtons = [...document.querySelectorAll('[data-site-range]')];

  const getArea = (site) => {
    const number = Number(site);
    if (number <= 9) {
      return '수영장 위쪽 산책 동선을 따라 배치된 개별 이용 쉘터입니다. 예약 안내에 표기된 번호와 대조해 주세요.';
    }
    if (number <= 15) {
      return '수영장 왼쪽 동선을 따라 배치된 개별 이용 쉘터입니다. 현장 이동 전 위치를 확인해 주세요.';
    }
    return '하단 진입부와 가까운 개별 이용 쉘터입니다. 예약 시 배정된 번호를 지도에서 확인해 주세요.';
  };

  const setSelected = (site) => {
    const number = String(site);
    hotspots.forEach((button) => button.classList.toggle('is-active', button.dataset.site === number));
    if (numberElement) numberElement.textContent = number.padStart(2, '0');
    if (titleElement) titleElement.textContent = `쉘터 ${number}`;
    if (descriptionElement) descriptionElement.textContent = getArea(number);
  };

  hotspots.forEach((button) => button.addEventListener('click', () => setSelected(button.dataset.site)));
  rangeButtons.forEach((button) => button.addEventListener('click', () => {
    const [start, end] = button.dataset.siteRange.split('-').map(Number);
    const target = hotspots.find((hotspot) => {
      const number = Number(hotspot.dataset.site);
      return number >= start && number <= end;
    });
    target?.focus();
    target?.click();
  }));
}

initSiteMap();

const lightbox = document.querySelector('.lightbox');
if (lightbox) {
  const lightboxImage = lightbox.querySelector('img');
  const closeButton = lightbox.querySelector('.lightbox-close');
  document.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => {
      const image = item.querySelector('img');
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      lightbox.classList.add('is-open');
    });
  });
  const close = () => lightbox.classList.remove('is-open');
  closeButton?.addEventListener('click', close);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
