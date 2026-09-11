import('./admin-cms-v2.js?v=20260911-cms3')
  .then(() => Promise.all([
    import('./admin-cms-enhancements.js?v=20260911-enhance1'),
    import('./admin-attribution.js?v=20260911-attribution1')
  ]))
  .catch((error) => {
    console.error('[RE:LIM ADMIN CMS LOAD]', error);
    const loading = document.querySelector('[data-admin-loading]');
    if (loading) {
      loading.innerHTML = '<h1>관리자 기능을 불러오지 못했습니다.</h1><p>페이지를 새로고침한 뒤 다시 시도해 주세요.</p>';
    }
  });
