import('./mypage-v2.js?v=20260911-clean1').catch((error) => {
  console.error('[RE:LIM MYPAGE LOAD]', error);
  const root = document.querySelector('[data-mypage]');
  const loading = root?.querySelector('[data-mypage-loading]');
  if (loading) loading.textContent = '마이페이지를 불러오지 못했습니다. 새로고침해 주세요.';
});
