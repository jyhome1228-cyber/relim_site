const SATURDAY_NOTE = '토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다. 토요일 2부(16:00–21:00) 이용은 정상 가능합니다.';

function patchFaq(id, updates) {
  const data = Array.isArray(window.RELIM_FAQ_DATA) ? window.RELIM_FAQ_DATA : null;
  if (!data) return;
  const item = data.find((entry) => entry.id === id);
  if (item) Object.assign(item, updates);
}

function patchFaqDetails() {
  if (!Array.isArray(window.RELIM_FAQ_DATA)) return;

  patchFaq(32, {
    answer: '<p>기본 바비큐 세트에는 1인 기준 삼겹살과 목살 총 220g, 쌈 채소와 기본 반찬이 포함됩니다. <strong>계란찜은 쉘터당 1개가 기본 제공</strong>되며, 추가 주문은 1개당 3,000원입니다. 기본 반찬에는 김치·파절이·명이나물·상추·깻잎·고추·마늘과 <strong>고사리</strong>가 포함됩니다.</p>',
    keywords: ['바비큐세트','기본세트','구성','고기','반찬','계란찜','쉘터당1개','고사리','220g']
  });

  patchFaq(51, {
    answer: '<p>수영복, 아쿠아슈즈, 개인 수건, 세면도구와 필요한 물놀이 안전용품을 준비해 주세요. 일반 개인 튜브는 반입·사용할 수 있지만, <strong>내부에 스팽글이나 반짝이 재료가 들어간 튜브는 파손 시 위생·수질 관리 문제로 사용할 수 없습니다.</strong></p><p>숙박 고객은 바닥 매트와 개인 침구도 반드시 준비해 주세요. 토요일은 정비시간 운영으로 숙박이 불가합니다.</p>',
    keywords: ['준비물','수영복','아쿠아슈즈','수건','세면도구','튜브','스팽글튜브','반짝이튜브','침구','토요일숙박']
  });

  patchFaq(54, {
    answer: '<p>튜브와 구명조끼는 개인 지참을 기준으로 준비해 주세요. 일반 개인 튜브는 사용할 수 있으나, <strong>스팽글·반짝이 재료가 들어간 튜브는 사용이 금지</strong>됩니다. 현장 대여 여부나 수량을 전제로 방문하면 이용이 어려울 수 있습니다.</p>',
    keywords: ['튜브대여','구명조끼대여','대여','렌탈','물놀이용품','개인지참','스팽글튜브','반짝이튜브']
  });

  const search = document.getElementById('faqSearch');
  if (search) search.dispatchEvent(new Event('input', { bubbles: true }));
}

function replaceExactText(selector, from, to) {
  document.querySelectorAll(selector).forEach((element) => {
    if (element.textContent.trim() === from) element.textContent = to;
  });
}

function patchGuideCopy() {
  replaceExactText(
    'p',
    '수영복, 여벌 옷, 개인 수건·세면도구와 아쿠아슈즈를 준비해 주세요. 수영장과 유수풀에서는 아쿠아슈즈 착용이 필수이며, 어린이와 영유아는 반드시 보호자가 가까이에서 동반·감독해야 합니다. 2부 수영장과 유수풀은 21:00까지 이용할 수 있습니다.',
    '수영복, 여벌 옷, 개인 수건·세면도구와 아쿠아슈즈를 준비해 주세요. 수영장과 유수풀에서는 아쿠아슈즈 착용이 필수이며, 어린이와 영유아는 반드시 보호자가 가까이에서 동반·감독해야 합니다. 일반 개인 튜브는 사용할 수 있지만, 내부에 스팽글이나 반짝이 재료가 들어간 튜브는 파손 시 위생·수질 관리 문제로 사용할 수 없습니다. 2부 수영장과 유수풀은 21:00까지 이용할 수 있습니다.'
  );

  replaceExactText(
    'p',
    '숙박은 2부 예약 확정 고객만 무료로 추가할 수 있습니다. 숙박 정원은 영유아·아동 포함 최대 4인이며, 공식 인스타그램 DM으로 신청해 주세요. 토요일은 다음 이용 준비를 위한 정비시간 운영으로 숙박이 불가합니다.',
    `숙박은 토요일을 제외한 2부 예약 확정 고객만 무료로 추가할 수 있습니다. 숙박 정원은 영유아·아동 포함 최대 4인이며, 공식 인스타그램 DM으로 신청해 주세요. ${SATURDAY_NOTE}`
  );
}

function patchFaqStructuredData() {
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    let data;
    try { data = JSON.parse(script.textContent); } catch { return; }
    if (!data || data['@type'] !== 'FAQPage' || !Array.isArray(data.mainEntity)) return;

    const entries = [
      {
        '@type': 'Question',
        name: '토요일 오후에도 숙박할 수 있나요?',
        acceptedAnswer: { '@type': 'Answer', text: SATURDAY_NOTE }
      },
      {
        '@type': 'Question',
        name: '개인 튜브를 가져가도 되나요?',
        acceptedAnswer: { '@type': 'Answer', text: '일반 개인 튜브는 사용할 수 있습니다. 다만 내부에 스팽글이나 반짝이 재료가 들어간 튜브는 파손 시 위생 및 수질 관리 문제로 사용할 수 없습니다.' }
      },
      {
        '@type': 'Question',
        name: '계란찜은 기본 제공되나요?',
        acceptedAnswer: { '@type': 'Answer', text: '계란찜은 쉘터당 1개가 기본 제공되며 추가 주문은 1개당 3,000원입니다.' }
      },
      {
        '@type': 'Question',
        name: '기본 반찬에는 어떤 메뉴가 포함되나요?',
        acceptedAnswer: { '@type': 'Answer', text: '김치, 파절이, 명이나물, 상추, 깻잎, 고추, 마늘과 고사리가 기본으로 제공됩니다.' }
      }
    ];

    entries.forEach((entry) => {
      const existing = data.mainEntity.find((item) => item.name === entry.name);
      if (existing) Object.assign(existing, entry);
      else data.mainEntity.push(entry);
    });
    script.textContent = JSON.stringify(data);
  });
}

function run() {
  patchFaqDetails();
  patchGuideCopy();
  patchFaqStructuredData();
}

run();
window.setTimeout(run, 0);
