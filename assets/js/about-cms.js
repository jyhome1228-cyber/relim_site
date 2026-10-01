import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, firebaseReady } from './firebase-config.js';

const DEFAULT_ABOUT = {
  chapter1: {
    eyebrow: 'ABOUT RE:LIM',
    title: '숲을 오래 바라본 끝에,\n우리는 산을 보게 되었습니다.',
    body1: '하나의 숲을 가꾸며 쌓아온 경험은\n자연을 바라보는 우리의 시선을 바꾸었습니다.',
    body2: '나무에서 숲으로, 숲에서 산으로.\n그렇게 넓어진 시선이 또 하나의 공간, RE:LIM으로 이어졌습니다.',
    imageUrl: 'https://nineworksdatabase.planus253.workers.dev/cdn/uncategorized/20260929-224912-1745365d-1672-405a-80b6-69113e806d63-39e829a0.webp'
  },
  chapter2: {
    eyebrow: 'THE BEGINNING',
    title: '시작은 작은 숲이었습니다.',
    body1: '오랫동안 조용히 머물러 있던 숲에\n사람의 손길이 닿기 시작했습니다.',
    body2: '계절을 지나며 숲을 가꾸고 지키는 동안\n사람과 자연은 서로 관계를 맺었습니다.\n그 첫 번째 숲의 이름이 나인힐스였습니다.',
    imageUrl: ''
  },
  chapter3: {
    eyebrow: 'GROWING TOGETHER',
    title: '숲을 돌보는 동안,\n우리의 시선도 자랐습니다.',
    body1: '처음에는 눈앞의 나무를 돌보는 법을 배웠습니다.\n시간이 흐르며 숲의 구조를 이해하고,\n그 너머로 이어지는 산을 바라보게 되었습니다.',
    body2: '숲을 관리하던 시선은\n새로운 공간을 생각하는 시선으로 넓어졌습니다.',
    imageUrl: 'https://nineworksdatabase.planus253.workers.dev/cdn/uncategorized/20260929-224912-8875141e-a8ed-4138-bf68-a52ee7f4fd25-5c2574aa.webp'
  },
  chapter4: {
    eyebrow: 'THE SECOND FOREST',
    title: '두 번째 숲에서\n쉼을 다시 생각했습니다.',
    body1: '숲에서 얻은 배움은\n또 다른 공간, 레이지캠프로 이어졌습니다.',
    body2: '조금 천천히 머물고,\n편안하게 자신에게 돌아오는 곳.\n두 번째 숲에는 느림과 회복을 담았습니다.',
    imageUrl: ''
  },
  chapter5: {
    eyebrow: 'WHY RE:LIM',
    title: '그래서 우리는\n또 하나의 공간을 만들었습니다.',
    body1: '숲을 돌보며 배운 것들과, 두 번째 숲에서 생각한 쉼.\n그 경험을 바탕으로 숲과 산,\n그 안에 머무는 사람의 시간을 한자리에 담고 싶었습니다.',
    body2: '',
    closing: '숲의 깊이, 산의 호흡, 그리고 사람의 시간.\n그렇게 RE:LIM이 시작되었습니다.',
    imageUrl: 'https://nineworksdatabase.planus253.workers.dev/cdn/uncategorized/20260929-224913-c64ae6e0-96d1-4a58-8275-dde4954366bf-5bd6b565.webp'
  }
};

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function merge(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return base;
  Object.entries(incoming).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      base[key] = merge(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
    } else {
      base[key] = value;
    }
  });
  return base;
}

function setMultiline(element, value) {
  if (!element || value == null) return;
  const lines = String(value).split(/\n/);
  element.replaceChildren();
  lines.forEach((line, index) => {
    if (index) element.append(document.createElement('br'));
    element.append(document.createTextNode(line));
  });
}

function setParagraph(element, value) {
  if (!element || value == null) return;
  element.textContent = String(value);
  element.style.whiteSpace = 'pre-line';
}

function setImage(figure, imageUrl, alt) {
  const url = clean(imageUrl);
  if (!figure || !url) return;
  let image = figure.querySelector('img');
  if (!image) {
    figure.replaceChildren();
    image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    figure.append(image);
  }
  image.src = url;
  image.alt = alt || 'RE:LIM 브랜드 스토리 이미지';
}

function applyChapter(section, data, options = {}) {
  if (!section || !data) return;
  const eyebrow = section.querySelector('.story-eyebrow');
  if (eyebrow && clean(data.eyebrow)) {
    const number = eyebrow.querySelector('.story-number')?.cloneNode(true);
    eyebrow.replaceChildren();
    if (number) eyebrow.append(number);
    eyebrow.append(document.createTextNode(clean(data.eyebrow)));
  }
  setMultiline(section.querySelector('h1,h2'), data.title);
  const bodies = [...section.querySelectorAll('.story-body')];
  setParagraph(bodies[0], data.body1);
  if (bodies[1]) {
    const value = String(data.body2 ?? '').trim();
    bodies[1].hidden = !value;
    if (value) setParagraph(bodies[1], value);
  }
  if (options.closing) setMultiline(section.querySelector('.story-closing-line'), data.closing);
  setImage(section.querySelector(options.ending ? '.story-ending-image' : '.story-figure'), data.imageUrl, clean(data.title).replace(/\n/g, ' '));
}

async function init() {
  if (!firebaseReady || !document.body.classList.contains('relim-story-page')) return;
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = getFirestore(app);
  try {
    const snapshot = await getDoc(doc(db, 'siteConfig', 'public'));
    if (!snapshot.exists()) return;
    const incoming = snapshot.data()?.aboutStory;
    if (!incoming || typeof incoming !== 'object') return;
    const data = merge(JSON.parse(JSON.stringify(DEFAULT_ABOUT)), incoming);
    applyChapter(document.querySelector('#story-relim'), data.chapter1);
    applyChapter(document.querySelector('#story-beginning'), data.chapter2);
    applyChapter(document.querySelector('#story-growth'), data.chapter3);
    applyChapter(document.querySelector('#story-lazy'), data.chapter4);
    applyChapter(document.querySelector('#story-why'), data.chapter5, { closing: true, ending: true });
  } catch (error) {
    console.warn('[RE:LIM ABOUT CMS]', error);
  }
}

init();
