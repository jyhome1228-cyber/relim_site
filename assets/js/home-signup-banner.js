const STORAGE_KEY = 'relim-reservation-banner-dismissed-date';
const excludedPages = new Set(['admin.html', 'login.html', 'signup.html', 'mypage.html']);
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const RESERVATION_URL = 'https://camfit.co.kr/camp/6a6b276b521182001db33430?keyword=%EB%A6%AC%EB%A6%BC&adultCnt=2';

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

if (!excludedPages.has(currentPage) && !dismissedToday() && !document.querySelector('[data-home-signup-banner]')) {
  if (!document.querySelector('[data-home-signup-banner-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'assets/css/home-signup-banner.css?v=20260813-mobilefix1';
    style.dataset.homeSignupBannerStyle = '';
    document.head.append(style);
  }

  const banner = document.createElement('aside');
  banner.className = 'home-signup-banner';
  banner.dataset.homeSignupBanner = '';
  banner.setAttribute('aria-label', '리림 예약 안내');
  banner.innerHTML = `
    <div class="home-signup-banner__inner">
      <p class="home-signup-banner__copy">
        <strong>WELCOME TO RE:LIM</strong>
        <span>리림 예약이 오픈되었습니다. 원하는 날짜와 시간을 확인해 보세요.</span>
      </p>
      <div class="home-signup-banner__actions">
        <a class="home-signup-banner__cta" href="${RESERVATION_URL}" target="_blank" rel="noopener">예약하러 가기</a>
        <button class="home-signup-banner__dismiss" type="button" data-banner-dismiss aria-label="오늘은 리림 예약 안내 다시 보지 않기">오늘은 다시 보지 않기 <span aria-hidden="true">×</span></button>
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
