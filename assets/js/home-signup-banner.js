const STORAGE_KEY = 'relim-announcement-dismissed-date';
const excludedPages = new Set(['admin.html', 'signup.html']);
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dismissedToday() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === localDateKey();
  } catch {
    return false;
  }
}

function saveDismissedToday() {
  try {
    window.localStorage.setItem(STORAGE_KEY, localDateKey());
  } catch {}
}

function returnTarget() {
  const file = currentPage || 'index.html';
  return `${file}${window.location.search || ''}${window.location.hash || ''}`;
}

if (!excludedPages.has(currentPage) && !dismissedToday() && !document.querySelector('[data-home-signup-banner]')) {
  if (!document.querySelector('[data-home-signup-banner-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'assets/css/home-signup-banner.css?v=20260812-2';
    style.dataset.homeSignupBannerStyle = '';
    document.head.append(style);
  }

  const banner = document.createElement('aside');
  banner.className = 'home-signup-banner';
  banner.dataset.homeSignupBanner = '';
  banner.setAttribute('aria-label', '리림 회원가입 안내');
  banner.innerHTML = `
    <div class="home-signup-banner__inner">
      <p class="home-signup-banner__copy">
        <strong>WELCOME TO RE:LIM</strong>
        <span>리림의 다양한 혜택과 이벤트를 준비 중입니다. 지금 회원가입하고 먼저 만나보세요.</span>
      </p>
      <div class="home-signup-banner__actions">
        <a class="home-signup-banner__cta" href="signup.html?return=${encodeURIComponent(returnTarget())}">회원가입</a>
        <button class="home-signup-banner__dismiss" type="button" data-banner-dismiss aria-label="오늘 하루 리림 회원가입 안내 보지 않기">오늘 하루 보지 않기 <span aria-hidden="true">×</span></button>
      </div>
    </div>
  `;

  const header = document.querySelector('.site-header');
  if (header) header.before(banner);
  else document.body.prepend(banner);

  let resizeObserver = null;

  const syncHeight = () => {
    if (!banner.isConnected) return;
    const height = Math.ceil(banner.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--relim-announcement-height', `${height}px`);
    document.body.classList.add('relim-announcement-visible');
  };

  const dismiss = () => {
    saveDismissedToday();
    resizeObserver?.disconnect();
    banner.classList.add('is-closing');
    document.body.classList.remove('relim-announcement-visible');
    document.documentElement.style.removeProperty('--relim-announcement-height');
    window.setTimeout(() => banner.remove(), 160);
  };

  banner.querySelector('[data-banner-dismiss]')?.addEventListener('click', dismiss);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(banner);
  }

  window.requestAnimationFrame(syncHeight);
  window.addEventListener('resize', syncHeight, { passive: true });
}
