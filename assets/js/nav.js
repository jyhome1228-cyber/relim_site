import('./member-sync.js').catch((error) => console.error('[RE:LIM MEMBER SYNC]', error));

const NAV_STYLE_VERSION = '20260807-2305';

function ensureNavStyles() {
  if (document.querySelector('[data-relim-nav-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `assets/css/nav-dropdown.css?v=${NAV_STYLE_VERSION}`;
  link.dataset.relimNavStyle = '';
  document.head.append(link);
}

function createNavLink(label, href, className = '') {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  if (className) link.className = className;
  return link;
}

function initRelimNavigation() {
  ensureNavStyles();

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
  });
}

initRelimNavigation();
