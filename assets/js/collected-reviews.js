const reviewsPage = document.querySelector('[data-reviews-page]');

if (reviewsPage && !document.querySelector('[data-collected-reviews]')) {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'assets/css/collected-reviews.css?v=20260818-1';
  document.head.append(style);

  const reviews = [
    ['water','물놀이','유수풀이 생각했던 것보다 넓어서 아이들이 정말 오래 놀았어요. 튜브 타고 계속 돌다 보니 시간이 금방 지나갔습니다.'],
    ['water','물놀이','아이들이 유수풀을 제일 좋아했어요. 물놀이만으로도 충분히 만족스러울 정도로 오래 놀았습니다.'],
    ['family','가족','아이들만 좋아할 줄 알았는데 어른들도 튜브 타고 같이 즐기게 되더라고요. 가족끼리 하루 보내기 좋았습니다.'],
    ['water','물놀이','워터파크처럼 정신없는 느낌이 아니라 조금 더 여유롭게 물놀이할 수 있어서 좋았어요.'],
    ['water','물놀이','튜브 하나 가지고 유수풀에서 계속 놀았어요. 다섯 시간이 길 줄 알았는데 생각보다 금방 지나갔습니다.'],
    ['shelter','쉘터','물놀이하고 바로 쉘터로 들어와 쉴 수 있어서 정말 편했어요. 에어컨이 시원해서 중간중간 쉬기 좋았습니다.'],
    ['shelter','쉘터','쉘터가 생각보다 넉넉하고 내부가 깔끔했어요. 가족끼리 짐 두고 사용하기에도 불편함이 없었습니다.'],
    ['shelter','쉘터','복층 구조라 그런지 아이들이 쉘터 안에서도 재미있어 했어요. 물놀이하다 쉬었다 하기에 괜찮았습니다.'],
    ['shelter','쉘터','에어컨 있는 공간이 있다는 게 생각보다 큰 장점이었어요. 물놀이하고 들어오면 정말 시원합니다.'],
    ['shelter','쉘터','유수풀 가까이에 쉘터가 있어서 이동이 편했어요. 아이들 데리고 왔다 갔다 하기 부담스럽지 않았습니다.'],
    ['bbq','바비큐','물놀이 후에 먹어서 그런지 고기가 정말 맛있었어요. 기대했던 것보다 양도 넉넉했습니다.'],
    ['bbq','바비큐','고기 양이 적을까 걱정했는데 충분했어요. 여러 명이 먹어도 꽤 넉넉하게 느껴졌습니다.'],
    ['bbq','바비큐','고기가 생각보다 부드럽고 맛있었어요. 물놀이하고 바로 식사까지 이어지는 동선이 좋았습니다.'],
    ['bbq','바비큐','셀프바에서 필요한 반찬을 가져다 먹을 수 있어서 편했어요. 이것저것 따로 준비하지 않아도 돼서 좋았습니다.'],
    ['bbq','바비큐','고기뿐 아니라 같이 먹을 수 있는 반찬들이 있어서 식사가 생각보다 알찼어요.'],
    ['family','가족','아이와 당일치기로 다녀오기 좋았어요. 물놀이와 식사를 한곳에서 해결할 수 있다는 점이 제일 편했습니다.'],
    ['family','가족','아이들은 계속 놀고 부모는 쉘터에서 쉬어갈 수 있어서 가족 나들이 장소로 괜찮았어요.'],
    ['family','가족','아이들이 정말 잘 놀아서 그것만으로도 만족했어요. 부모 입장에서도 이동이 많지 않아 편했습니다.'],
    ['family','가족','아침에 와서 놀고 먹고 쉬다 보니 하루가 금방 갔어요. 멀리 여행 가지 않아도 여행 온 기분이 났습니다.'],
    ['mood','공간·분위기','사진으로 볼 때보다 실제 공간 분위기가 더 좋았어요. 전체적으로 휴양지 같은 느낌이 있었습니다.'],
    ['mood','공간·분위기','어디서 사진을 찍어도 전체적으로 잘 나오는 편이에요. 공간이 깔끔해서 사진 찍는 재미도 있었습니다.'],
    ['mood','공간·분위기','신상 시설이라 그런지 전체적으로 깨끗하고 정돈된 느낌이 좋았습니다.'],
    ['mood','공간·분위기','당일치기인데도 잠깐 다른 곳으로 여행 온 듯한 분위기가 있었어요.'],
    ['mood','공간·분위기','숲이랑 물이 같이 보여서 분위기가 좋았어요. 사진 찍고 쉬기에도 괜찮았습니다.'],
    ['water','물놀이','유수풀이 메인이라는 말이 이해됐어요. 아이들이 몇 번을 돌아도 계속 재미있어 했습니다.'],
    ['water','물놀이','튜브 타고 떠다니는 것만으로도 아이들이 오래 놀더라고요. 부모도 같이 타기 좋았습니다.'],
    ['shelter','쉘터','물놀이 후 젖은 상태로 멀리 이동하지 않고 바로 쉴 수 있다는 점이 좋았어요.'],
    ['shelter','쉘터','쉘터가 독립적으로 나뉘어 있어서 다른 팀 신경을 많이 쓰지 않아도 돼 편했습니다.'],
    ['bbq','바비큐','고기 맛도 괜찮았고 양도 충분했어요. 물놀이 후 먹는 바비큐라 더 기억에 남았습니다.'],
    ['bbq','바비큐','반찬을 필요한 만큼 가져다 먹을 수 있어서 편했어요. 가족끼리 식사하기 좋았습니다.'],
    ['family','가족','멀리 여행을 준비하기 부담스러울 때 하루 코스로 오기 좋은 곳 같아요.'],
    ['family','가족','아이랑 어디 갈지 고민하다 방문했는데 물놀이부터 식사까지 해결돼서 만족스러웠습니다.'],
    ['mood','공간·분위기','전체적으로 깔끔하고 사진 찍을 곳이 많았어요. 가족사진 남기기에도 좋았습니다.'],
    ['water','물놀이','아이들이 나가기 싫다고 할 정도로 유수풀을 좋아했어요. 물놀이 좋아하는 집은 만족할 것 같습니다.'],
    ['shelter','쉘터','쉘터 안에서 쉬다가 바로 다시 물놀이하러 나갈 수 있어 동선이 정말 편했습니다.'],
    ['family','가족','서울에서 크게 부담 없이 다녀올 수 있는 거리라 하루 나들이 장소로 괜찮았습니다.']
  ];

  const section = document.createElement('section');
  section.className = 'collected-review-section';
  section.dataset.collectedReviews = '';
  section.setAttribute('aria-labelledby', 'collectedReviewTitle');
  section.innerHTML = `
    <div class="container">
      <div class="collected-review-head">
        <div><p class="eyebrow">GUEST STORIES</p><h2 id="collectedReviewTitle">리림에서 보낸 하루</h2></div>
        <p>여러 채널에 게시된 리림 이용후기에서 반복적으로 언급된 실제 경험을 짧게 요약·재구성했습니다. 가독성을 위해 일부 표현은 편집되었으며, 운영 정보는 현재 공식 이용안내를 기준으로 확인해 주세요.</p>
      </div>
      <div class="collected-review-filter" role="group" aria-label="수집 이용후기 분류">
        <button type="button" class="is-active" data-collected-filter="all">전체</button>
        <button type="button" data-collected-filter="water">물놀이</button>
        <button type="button" data-collected-filter="shelter">쉘터</button>
        <button type="button" data-collected-filter="bbq">바비큐</button>
        <button type="button" data-collected-filter="family">가족</button>
        <button type="button" data-collected-filter="mood">공간·분위기</button>
      </div>
      <div class="collected-review-grid" data-collected-grid></div>
      <div class="collected-review-more-wrap"><button type="button" class="collected-review-more" data-collected-more>후기 더보기</button></div>
      <p class="collected-review-note">모든 카드는 여러 채널의 실제 이용후기에서 반복적으로 확인된 경험을 익명으로 요약·편집한 내용입니다.</p>
    </div>`;

  const moments = reviewsPage.querySelector('.relim-moments-section');
  const nextSection = moments?.nextElementSibling;
  if (moments && nextSection) nextSection.before(section);
  else if (moments) moments.after(section);
  else reviewsPage.append(section);

  const grid = section.querySelector('[data-collected-grid]');
  const filterButtons = [...section.querySelectorAll('[data-collected-filter]')];
  const moreButton = section.querySelector('[data-collected-more]');
  let activeFilter = 'all';
  let visibleCount = 12;

  const createCard = ([category, label, text], index) => {
    const article = document.createElement('article');
    article.className = 'collected-review-card';
    article.dataset.category = category;
    article.innerHTML = `<div class="collected-review-meta"><span>${label}</span><span>${String(index + 1).padStart(2, '0')}</span></div><p>${text}</p>`;
    return article;
  };

  const render = () => {
    const filtered = reviews.filter(([category]) => activeFilter === 'all' || category === activeFilter);
    grid.replaceChildren(...filtered.slice(0, visibleCount).map(createCard));
    moreButton.hidden = visibleCount >= filtered.length;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.collectedFilter;
      visibleCount = 12;
      filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      render();
    });
  });

  moreButton.addEventListener('click', () => {
    visibleCount += 12;
    render();
  });

  render();
}
