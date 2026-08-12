const SATURDAY_LODGING_NOTE = '토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다. 토요일 2부(16:00–21:00) 이용은 정상 가능합니다.';

function patchFaqItem(id, updates) {
  const data = Array.isArray(window.RELIM_FAQ_DATA) ? window.RELIM_FAQ_DATA : null;
  if (!data) return;
  const item = data.find((entry) => entry.id === id);
  if (!item) return;
  Object.assign(item, updates);
}

function ensureFaqItem(item) {
  const data = Array.isArray(window.RELIM_FAQ_DATA) ? window.RELIM_FAQ_DATA : null;
  if (!data || data.some((entry) => entry.id === item.id || entry.question === item.question)) return;
  data.push(item);
}

function patchFaqData() {
  if (!Array.isArray(window.RELIM_FAQ_DATA)) return;

  patchFaqItem(2, {
    answer: `<p>일반 숙박형 글램핑장과는 운영 방식이 다릅니다. 리림은 오전과 오후의 <strong>타임제 이용</strong>을 기본으로 하며, 숙박은 <strong>토요일을 제외한 2부 이용 고객</strong>이 신청할 수 있는 추가 옵션입니다.</p><p>${SATURDAY_LODGING_NOTE}</p>`,
    keywords: ['일반글램핑','글램핑장','숙박형','캠핑장','당일이용','타임제','캠프닉','토요일숙박','토요일']
  });

  patchFaqItem(3, {
    answer: `<p>숙박만 단독으로 예약할 수는 없습니다. 숙박 옵션은 <strong>토요일을 제외한 2부(오후 타임) 예약 확정 고객</strong>에 한해 무료로 추가할 수 있습니다. 침구류는 제공되지 않으므로 개인 침구를 준비해 주세요.</p><p>${SATURDAY_LODGING_NOTE}</p><p>숙박 추가는 리림 공식 인스타그램 DM으로 문의해 주세요.</p><p><a class="faq-inline-link" href="https://www.instagram.com/relimofficial/" target="_blank" rel="noopener">@relimofficial 바로가기 ↗</a></p>`,
    keywords: ['숙박만','숙박단독','1박만','잠만','숙박예약','오후숙박','2부숙박','토요일숙박','정비시간']
  });

  patchFaqItem(7, {
    answer: `<p>2부 오후 타임은 <strong>16:00부터 21:00까지</strong>입니다. 숙박 옵션을 신청한 고객은 동일한 16:00에 입실하며 익일 08:50에 퇴실합니다.</p><p>${SATURDAY_LODGING_NOTE}</p>`,
    keywords: ['2부','오후','오후시간','운영시간','입장시간','21시','16시','저녁타임','야간','토요일숙박']
  });

  patchFaqItem(20, {
    answer: `<p>극성수기 기준으로 4명이 2부와 숙박 옵션을 이용할 경우 다음과 같습니다.</p><div class="faq-calc"><span>쉘터 이용료 150,000원</span><span>＋ 인원 요금 100,000원</span><span>＋ 숙박 옵션 무료</span><strong>＝ 총 250,000원</strong></div><p class="faq-note">숙박은 토요일을 제외한 2부 예약 고객에게 제공되며, 시즌에 따라 쉘터 이용료가 달라질 수 있습니다. 개인 침구 지참이 필수입니다.</p>`,
    keywords: ['4명숙박','네명숙박','숙박금액','총금액','250000','25만원','계산','숙박비','토요일제외']
  });

  patchFaqItem(21, {
    answer: `<p>네. <strong>토요일을 제외한 2부(오후 타임) 예약 고객</strong>은 숙박 옵션을 무료로 추가할 수 있습니다. 개인 침구와 바닥 매트를 직접 준비해야 하며, 숙박 추가는 공식 인스타그램 DM으로 문의해 주세요.</p><p>${SATURDAY_LODGING_NOTE}</p><p><a class="faq-inline-link" href="https://www.instagram.com/relimofficial/" target="_blank" rel="noopener">@relimofficial 바로가기 ↗</a></p>`,
    keywords: ['숙박','1박','자고가기','잠','글램핑숙박','오후숙박','밤','숙박가능','토요일숙박','정비시간']
  });

  patchFaqItem(22, {
    answer: `<p>숙박 옵션은 <strong>토요일을 제외한 2부(16:00~21:00) 예약 확정 고객</strong>만 무료로 신청할 수 있습니다. 1부 고객이나 숙박만 단독 이용하는 방식은 제공하지 않습니다.</p><p>${SATURDAY_LODGING_NOTE}</p><p>추가 신청은 공식 인스타그램 DM으로 문의해 주세요.</p><p><a class="faq-inline-link" href="https://www.instagram.com/relimofficial/" target="_blank" rel="noopener">@relimofficial 바로가기 ↗</a></p>`,
    keywords: ['숙박조건','숙박신청','2부고객','오후예약','숙박자격','단독숙박','토요일숙박','정비시간']
  });

  patchFaqItem(24, {
    answer: `<p>숙박 추가 옵션은 <strong>무료</strong>입니다. 단, <strong>토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가</strong>합니다. 토요일을 제외한 2부 이용요금과 인원 요금만 적용되며 개인 침구 지참이 필수입니다.</p><p>숙박 추가는 리림 공식 인스타그램 DM으로 문의해 주세요.</p>`,
    keywords: ['숙박비','숙박요금','추가요금','무료숙박','1박비용','숙박옵션','토요일숙박','정비시간']
  });

  patchFaqItem(30, {
    answer: `<p>숙박 고객의 입실은 2부 시작 시간인 <strong>16:00</strong>이며 퇴실은 익일 <strong>08:50</strong>입니다. 퇴실 시간 전에 개인 물품과 공간을 정리해 주세요.</p><p>${SATURDAY_LODGING_NOTE}</p>`,
    keywords: ['숙박입실','숙박퇴실','체크인','체크아웃','16시','8시50분','익일','퇴실시간','토요일숙박']
  });

  patchFaqItem(35, {
    answer: '<p>네. 계란찜은 기본 바비큐 세트에 포함되며 <strong>쉘터당 1개가 기본 제공</strong>됩니다. 추가 주문은 <strong>1개당 3,000원</strong>입니다.</p>',
    keywords: ['계란찜','계란찜기본','쉘터당1개','추가계란찜','3000','3천원','사이드','기본제공']
  });

  patchFaqItem(36, {
    answer: '<p>김치, 파절이, 명이나물과 상추·깻잎·고추·마늘 등의 쌈 채소, <strong>고사리</strong>가 기본으로 제공됩니다.</p>',
    keywords: ['반찬','기본찬','김치','파절이','명이나물','상추','깻잎','쌈채소','고사리','고추','마늘']
  });

  patchFaqItem(38, {
    answer: '<p>고기와 식사 메뉴를 현장에서 추가 주문할 수 있습니다.</p><div class="faq-table-wrap"><table class="faq-table"><tbody><tr><th>고기 추가 200g</th><td>20,000원</td></tr><tr><th>공기밥</th><td>2,000원</td></tr><tr><th>계란찜 추가 1개</th><td>3,000원</td></tr><tr><th>차돌 된장찌개</th><td>5,000원</td></tr><tr><th>치즈 계란 볶음밥</th><td>6,000원</td></tr><tr><th>소주·맥주</th><td>4,000원</td></tr><tr><th>음료</th><td>3,000–5,000원</td></tr></tbody></table></div><p class="faq-note">주문 마감은 오전 타임 15:00, 오후 타임 20:00입니다.</p>',
    keywords: ['추가주문','추가고기','볶음밥','된장찌개','공기밥','계란찜','계란찜추가','3000','단품메뉴','20시']
  });

  patchFaqItem(49, {
    answer: '<p>개인 튜브를 가져와 사용할 수 있습니다. 다만 혼잡도와 안전 상황에 따라 사용 구역이나 크기가 제한될 수 있으므로 현장 안내를 따라주세요.</p><p><strong>튜브 내부에 스팽글·반짝이 재료가 들어간 제품은 사용할 수 없습니다.</strong> 튜브가 터질 경우 위생 및 수질 관리에 문제가 생길 수 있어 이용이 제한됩니다.</p>',
    keywords: ['튜브','개인튜브','대형튜브','튜브크기','물놀이용품','튜브반입','스팽글튜브','반짝이튜브','글리터튜브','튜브금지']
  });

  ensureFaqItem({
    id: 74,
    category: '숙박',
    question: '토요일 오후에도 숙박할 수 있나요?',
    answer: `<p>토요일 2부(16:00–21:00) 이용은 정상 가능합니다. 다만 <strong>다음 이용 준비를 위한 정비시간 운영으로 토요일 숙박은 불가</strong>합니다.</p><p>숙박을 원하시는 경우 토요일을 제외한 2부 예약 후 공식 인스타그램 DM으로 문의해 주세요.</p>`,
    keywords: ['토요일숙박','토요일오후','주말숙박','토요일2부','숙박불가','정비시간']
  });

  ensureFaqItem({
    id: 75,
    category: '수영장·시설',
    question: '반짝이·스팽글이 들어간 튜브도 사용할 수 있나요?',
    answer: '<p>아니요. <strong>튜브 내부에 스팽글이나 반짝이 재료가 들어간 제품은 사용이 금지</strong>됩니다. 파손 시 내용물이 수영장이나 유수풀에 퍼져 위생 및 수질 관리에 문제가 생길 수 있기 때문입니다.</p><p>일반 개인 튜브는 가져와 사용할 수 있으며 현장 안전 안내를 따라주세요.</p>',
    keywords: ['스팽글튜브','반짝이튜브','글리터튜브','튜브금지','개인튜브','수영장위생','수질']
  });

  if (Array.isArray(window.RELIM_FAQ_POPULAR_KEYWORDS)) {
    ['튜브','토요일숙박'].forEach((keyword) => {
      if (!window.RELIM_FAQ_POPULAR_KEYWORDS.includes(keyword)) window.RELIM_FAQ_POPULAR_KEYWORDS.push(keyword);
    });
  }

  const search = document.getElementById('faqSearch');
  if (search) search.dispatchEvent(new Event('input', { bubbles: true }));
}

function replaceExactText(selector, from, to) {
  document.querySelectorAll(selector).forEach((element) => {
    if (element.textContent.trim() === from) element.textContent = to;
  });
}

function patchVisibleOperationalCopy() {
  replaceExactText(
    'p',
    '2부 예약 고객은 공식 인스타그램 DM으로 숙박을 무료 추가할 수 있습니다. 개인 침구를 준비해 주세요.',
    '2부 예약 고객은 공식 인스타그램 DM으로 숙박을 무료 추가할 수 있습니다. 단, 토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다. 개인 침구를 준비해 주세요.'
  );

  replaceExactText(
    'p',
    '노을과 야간 조명이 만드는 풍경 속에서 바비큐와 대화를 즐기고, 2부 예약 확정 후 공식 인스타그램 DM으로 숙박을 무료 추가할 수 있는 저녁 상품입니다.',
    '노을과 야간 조명이 만드는 풍경 속에서 바비큐와 대화를 즐기는 저녁 상품입니다. 숙박은 토요일을 제외한 2부 예약 확정 고객이 공식 인스타그램 DM으로 무료 추가할 수 있습니다.'
  );

  replaceExactText(
    'li',
    '무료 숙박 최대 4인 · 개인 침구 지참',
    '무료 숙박 최대 4인 · 토요일 제외 · 개인 침구 지참'
  );

  replaceExactText(
    'p',
    '숙박 추가와 당일 예약은 공식 인스타그램 DM으로 문의해 주세요. 숙박은 2부 예약 확정 고객에게 무료이며, 영유아·아동을 포함해 최대 4인까지 가능합니다. 침구와 바닥 매트는 제공되지 않으므로 개인 매트와 침낭 등 침구를 준비해 주세요.',
    '숙박 추가와 당일 예약은 공식 인스타그램 DM으로 문의해 주세요. 숙박은 토요일을 제외한 2부 예약 확정 고객에게 무료이며, 영유아·아동을 포함해 최대 4인까지 가능합니다. 토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다. 침구와 바닥 매트는 제공되지 않으므로 개인 매트와 침낭 등 침구를 준비해 주세요.'
  );

  replaceExactText(
    'p',
    '숙박은 2부 예약 확정 고객만 무료로 추가할 수 있습니다. 숙박 정원은 영유아·아동 포함 최대 4인이며, 공식 인스타그램 DM으로 신청해 주세요.',
    '숙박은 토요일을 제외한 2부 예약 확정 고객만 무료로 추가할 수 있습니다. 숙박 정원은 영유아·아동 포함 최대 4인이며, 공식 인스타그램 DM으로 신청해 주세요. 토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다.'
  );

  replaceExactText(
    'p',
    '기본 바비큐에는 1인 기준 고기 220g, 쌈류, 계란찜과 기본 반찬이 포함되며 냄비라면은 제외됩니다. 외부 음식은 원칙적으로 제한되지만 생일 케이크와 껍질을 제거한 과일은 반입할 수 있습니다. 외부 주류에는 콜키지 30,000원이 적용됩니다.',
    '기본 바비큐에는 1인 기준 고기 220g과 기본 반찬이 포함됩니다. 계란찜은 쉘터당 1개 기본 제공되며 추가는 1개당 3,000원입니다. 김치·파절이·명이나물·쌈 채소와 고사리가 기본으로 제공됩니다. 외부 음식은 원칙적으로 제한되지만 생일 케이크와 껍질을 제거한 과일은 반입할 수 있습니다. 외부 주류에는 콜키지 30,000원이 적용됩니다.'
  );

  replaceExactText(
    'p',
    '숙박은 2부 예약 고객에게 무료로 제공됩니다. 입실은 16:00, 퇴실은 익일 08:50이며 침구와 바닥 매트는 제공되지 않습니다. 2층은 온돌 바닥이 아니므로 개인 매트와 침낭 등 침구를 반드시 준비해 주세요. 반려동물은 동반할 수 없습니다.',
    '숙박은 토요일을 제외한 2부 예약 고객에게 무료로 제공됩니다. 토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다. 입실은 16:00, 퇴실은 익일 08:50이며 침구와 바닥 매트는 제공되지 않습니다. 2층은 온돌 바닥이 아니므로 개인 매트와 침낭 등 침구를 반드시 준비해 주세요. 반려동물은 동반할 수 없습니다.'
  );
}

patchFaqData();
patchVisibleOperationalCopy();

window.setTimeout(() => {
  patchFaqData();
  patchVisibleOperationalCopy();
}, 0);
