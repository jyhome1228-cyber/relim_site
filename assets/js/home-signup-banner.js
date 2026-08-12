const currentPage = window.location.pathname.split('/').pop();
const isHome = !currentPage || currentPage === 'index.html';

if (isHome && !document.querySelector('[data-home-signup-banner]')) {
  if (!document.querySelector('[data-home-signup-banner-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'assets/css/home-signup-banner.css?v=20260812-1';
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
      <a class="home-signup-banner__cta" href="signup.html?return=index.html">회원가입</a>
    </div>
  `;

  const header = document.querySelector('.site-header');
  if (header) header.before(banner);
  else document.body.prepend(banner);
}
