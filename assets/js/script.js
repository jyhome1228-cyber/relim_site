const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

const slides = [...document.querySelectorAll('.hero-slide')];
const dots = [...document.querySelectorAll('.hero-dot')];
let currentSlide = 0;

function showSlide(index) {
  slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  currentSlide = index;
}

if (slides.length) {
  dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
  setInterval(() => showSlide((currentSlide + 1) % slides.length), 5200);
}

function bindStaticFaqAccordion() {
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const answer = document.getElementById(button.getAttribute('aria-controls'));
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      answer?.classList.toggle('is-open', !open);
    });
  });
}

function initRelimFaq() {
  const app = document.querySelector('[data-faq-app]');
  const searchInput = document.getElementById('faqSearch');
  const clearButton = document.getElementById('faqClear');
  const resetButton = document.getElementById('faqReset');
  const emptyResetButton = document.getElementById('faqEmptyReset');
  const categoriesElement = document.getElementById('faqCategories');
  const keywordsElement = document.getElementById('faqPopularKeywords');
  const resultSummary = document.getElementById('faqResultSummary');
  const listElement = document.getElementById('faqList');
  const emptyElement = document.getElementById('faqEmpty');

  const faqData = Array.isArray(window.RELIM_FAQ_DATA) ? window.RELIM_FAQ_DATA : [];
  const categories = Array.isArray(window.RELIM_FAQ_CATEGORIES)
    ? window.RELIM_FAQ_CATEGORIES
    : ['전체', ...new Set(faqData.map((item) => item.category))];
  const popularKeywords = Array.isArray(window.RELIM_FAQ_POPULAR_KEYWORDS)
    ? window.RELIM_FAQ_POPULAR_KEYWORDS
    : [];

  if (!app || !searchInput || !categoriesElement || !resultSummary || !listElement || !emptyElement) {
    bindStaticFaqAccordion();
    return;
  }

  let activeCategory = '전체';
  let currentQuery = '';

  const normalize = (value) => String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\s\-_/.,()[\]{}·~:;!?\'"“”‘’+]+/g, '');

  const getTokens = (query) => String(query || '')
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  const searchableFields = (item) => ({
    question: normalize(item.question),
    category: normalize(item.category),
    keywords: normalize((item.keywords || []).join(' ')),
    answer: normalize(item.answer)
  });

  const scoredItems = () => {
    const tokens = getTokens(currentQuery);

    return faqData
      .filter((item) => activeCategory === '전체' || item.category === activeCategory)
      .map((item) => {
        if (!tokens.length) return { item, score: 0 };

        const fields = searchableFields(item);
        const matched = tokens.every((token) =>
          fields.question.includes(token)
          || fields.category.includes(token)
          || fields.keywords.includes(token)
          || fields.answer.includes(token)
        );

        if (!matched) return null;

        let score = 0;
        tokens.forEach((token) => {
          if (fields.question.includes(token)) score += 40;
          if (fields.keywords.includes(token)) score += 24;
          if (fields.category.includes(token)) score += 12;
          if (fields.answer.includes(token)) score += 5;
        });

        return { item, score };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (currentQuery && b.score !== a.score) return b.score - a.score;
        return a.item.id - b.item.id;
      });
  };

  const closeAllItems = () => {
    listElement.querySelectorAll('.faq-question[aria-expanded="true"]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
    listElement.querySelectorAll('.faq-answer.is-open').forEach((answer) => {
      answer.classList.remove('is-open');
    });
  };

  const toggleItem = (button) => {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    const isOpen = button.getAttribute('aria-expanded') === 'true';

    closeAllItems();

    if (!isOpen && answer) {
      button.setAttribute('aria-expanded', 'true');
      answer.classList.add('is-open');
    }
  };

  const createFaqItem = (item) => {
    const article = document.createElement('article');
    article.className = 'faq-item';
    article.dataset.category = item.category;

    const button = document.createElement('button');
    button.className = 'faq-question';
    button.type = 'button';
    button.dataset.faqId = String(item.id);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `faq-answer-${item.id}`);

    const index = document.createElement('span');
    index.className = 'faq-index';
    index.textContent = String(item.id).padStart(2, '0');

    const copy = document.createElement('span');
    copy.className = 'faq-question-copy';

    const category = document.createElement('span');
    category.className = 'faq-item-category';
    category.textContent = item.category;

    const title = document.createElement('span');
    title.className = 'faq-question-title';
    title.textContent = item.question;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.setAttribute('aria-hidden', 'true');

    copy.append(category, title);
    button.append(index, copy, icon);

    const answer = document.createElement('div');
    answer.className = 'faq-answer';
    answer.id = `faq-answer-${item.id}`;
    answer.setAttribute('role', 'region');
    answer.setAttribute('aria-label', `${item.question} 답변`);

    const answerInner = document.createElement('div');
    answerInner.className = 'faq-answer-inner';
    answerInner.innerHTML = item.answer;
    answer.append(answerInner);

    button.addEventListener('click', () => toggleItem(button));
    article.append(button, answer);

    return article;
  };

  const updateSummary = (count) => {
    const queryLabel = currentQuery ? `‘${currentQuery}’ 검색 결과` : activeCategory;
    resultSummary.innerHTML = `<span>${queryLabel}</span> <strong>${count}</strong>개`;
  };

  const render = () => {
    const results = scoredItems();
    listElement.replaceChildren();

    results.forEach(({ item }) => {
      listElement.append(createFaqItem(item));
    });

    const hasResults = results.length > 0;
    listElement.hidden = !hasResults;
    emptyElement.hidden = hasResults;
    updateSummary(results.length);

    if (clearButton) {
      clearButton.hidden = !currentQuery;
    }

    categoriesElement.querySelectorAll('.faq-category').forEach((button) => {
      const active = button.dataset.category === activeCategory;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.setAttribute('tabindex', active ? '0' : '-1');
    });
  };

  const selectCategory = (category) => {
    activeCategory = category;
    render();
  };

  const resetFaq = () => {
    activeCategory = '전체';
    currentQuery = '';
    searchInput.value = '';
    render();
    searchInput.focus();
  };

  categories.forEach((categoryName) => {
    const button = document.createElement('button');
    button.className = 'faq-category';
    button.type = 'button';
    button.role = 'tab';
    button.dataset.category = categoryName;
    button.textContent = categoryName;
    button.addEventListener('click', () => selectCategory(categoryName));
    categoriesElement.append(button);
  });

  popularKeywords.forEach((keyword) => {
    const button = document.createElement('button');
    button.className = 'faq-keyword';
    button.type = 'button';
    button.dataset.faqKeyword = keyword;
    button.textContent = `#${keyword}`;
    button.addEventListener('click', () => {
      activeCategory = '전체';
      currentQuery = keyword;
      searchInput.value = keyword;
      render();
      searchInput.focus();
    });
    keywordsElement?.append(button);
  });

  searchInput.addEventListener('input', (event) => {
    currentQuery = event.target.value.trim();
    render();
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentQuery) {
      currentQuery = '';
      searchInput.value = '';
      render();
    }
  });

  clearButton?.addEventListener('click', () => {
    currentQuery = '';
    searchInput.value = '';
    render();
    searchInput.focus();
  });

  resetButton?.addEventListener('click', resetFaq);
  emptyResetButton?.addEventListener('click', resetFaq);

  const urlQuery = new URLSearchParams(window.location.search).get('q');
  if (urlQuery) {
    currentQuery = urlQuery.trim();
    searchInput.value = currentQuery;
  }

  render();
}

if (document.querySelector('[data-faq-app]') && Array.isArray(window.RELIM_FAQ_DATA)) {
  initRelimFaq();
} else {
  bindStaticFaqAccordion();
}

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox?.querySelector('img');

const closeLightbox = () => {
  lightbox?.classList.remove('is-open');
  document.body.style.overflow = '';
};

document.querySelectorAll('.gallery-item').forEach((item) => {
  item.addEventListener('click', () => {
    const image = item.querySelector('img');
    if (!lightbox || !lightboxImage || !image) return;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
});

lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
});

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav a').forEach((link) => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
});
