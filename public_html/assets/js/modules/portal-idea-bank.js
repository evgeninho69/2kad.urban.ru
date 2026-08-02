const IDEAS_ENDPOINT = '/api/tver-portal/ideas';
const LIKED_IDEAS_STORAGE_KEY = 'tverPortalLikedIdeas';
const CLIENT_ID_STORAGE_KEY = 'tverPortalIdeasClientId';

const THEME_META = {
  transport: { label: 'Транспорт', color: '#2A5CAA' },
  ecology: { label: 'Экология', color: '#2E8B57' },
  landscaping: { label: 'Благоустройство', color: '#2C9B8D' },
  housing: { label: 'Жилье и застройка', color: '#A35E2C' },
  economy: { label: 'Экономика', color: '#8C5AA5' },
  culture: { label: 'Культура', color: '#C96A42' },
  tourism: { label: 'Туризм', color: '#3E7AD9' },
  social: { label: 'Социальная инфраструктура', color: '#7A8B2F' },
  mobility: { label: 'Пешеходная и веломобильность', color: '#1B7C91' },
  safety: { label: 'Безопасность', color: '#B44B4B' },
  other: { label: 'Другое', color: '#7E7E7E' }
};

const normalize = (value) => String(value || '').trim();

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const shorten = (value, limit = 180) => {
  const text = normalize(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
};

const formatDate = (value) => {
  const timestamp = Date.parse(String(value || ''));
  if (Number.isNaN(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString('ru-RU');
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Ошибка загрузки данных.');
  }
  return body;
};

const readLikedIdeaIds = () => {
  try {
    const raw = localStorage.getItem(LIKED_IDEAS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item)));
  } catch {
    return new Set();
  }
};

const saveLikedIdeaIds = (set) => {
  try {
    localStorage.setItem(LIKED_IDEAS_STORAGE_KEY, JSON.stringify(Array.from(set.values())));
  } catch {
    // ignore
  }
};

const getClientId = () => {
  const existing = normalize(localStorage.getItem(CLIENT_ID_STORAGE_KEY));
  if (existing) return existing;

  const generated = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `client-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  try {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
  } catch {
    // ignore
  }

  return generated;
};

const getThemeMeta = (theme) => THEME_META[theme] || THEME_META.other;

const updateIdeaInCollection = (items, ideaId, patch) => (
  items.map((item) => (
    Number(item.id) === Number(ideaId)
      ? { ...item, ...patch }
      : item
  ))
);

const initIdeaBankState = () => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = Number(params.get('idea'));

  return {
    rawIdeas: [],
    filteredIdeas: [],
    selectedIdeaId: Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : null,
    needsInitialSelection: true,
    loading: false
  };
};

export function initPortalIdeaBank() {
  const page = document.querySelector('[data-idea-bank-page]');
  if (!page) return;

  const listNode = page.querySelector('[data-bank-list]');
  const detailNode = page.querySelector('[data-bank-detail]');
  const countNode = page.querySelector('[data-bank-count]');
  const themeNode = page.querySelector('[data-bank-theme]');
  const sortNode = page.querySelector('[data-bank-sort]');
  const searchNode = page.querySelector('[data-bank-search]');
  const detailCard = page.querySelector('.idea-bank-detail-card');

  if (!listNode || !detailNode || !countNode || !themeNode || !sortNode || !searchNode) return;

  const state = initIdeaBankState();

  const writeSelectedToUrl = (ideaId) => {
    const url = new URL(window.location.href);
    if (ideaId) {
      url.searchParams.set('idea', String(ideaId));
    } else {
      url.searchParams.delete('idea');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  const renderDetail = (idea) => {
    if (!idea) {
      detailNode.innerHTML = `
        <h3>Карточка идеи</h3>
        <p class="portal-muted">Выберите идею в списке слева, чтобы открыть подробности.</p>
      `;
      return;
    }

    const theme = getThemeMeta(idea.theme);
    const likedIds = readLikedIdeaIds();
    const liked = likedIds.has(Number(idea.id));
    const image = idea.imageUrl
      ? `<figure class="idea-bank-detail-image"><img src="${escapeHtml(idea.imageUrl)}" alt="Иллюстрация идеи: ${escapeHtml(idea.title)}" loading="lazy"></figure>`
      : '';

    detailNode.innerHTML = `
      <div class="idea-item-head">
        <h3>${escapeHtml(idea.title)}</h3>
        <span class="chip">${escapeHtml(theme.label)}</span>
      </div>
      ${image}
      <p>${escapeHtml(idea.description)}</p>
      <div class="idea-bank-meta">
        <span>${escapeHtml(idea.address)}</span>
        <span>${escapeHtml(formatDate(idea.createdAt))}</span>
        <span>${escapeHtml(idea.authorLabel || 'Участник')}</span>
      </div>
      <div class="idea-like-row">
        <button
          class="idea-like-btn"
          type="button"
          data-like-id="${idea.id}"
          data-liked="${liked ? 'true' : 'false'}"
        >${liked ? 'Лайк учтен' : 'Поддержать идею'}</button>
        <span class="idea-like-count">Лайков: <span data-like-count-for="${idea.id}">${Number(idea.likesCount || 0)}</span></span>
      </div>
      <div class="form-actions" style="margin-top:0.8rem;">
        <a class="btn btn-ghost" href="ideas.html#ideas-map">Показать на карте</a>
      </div>
    `;
  };

  const renderList = () => {
    const likedIds = readLikedIdeaIds();
    const items = state.filteredIdeas;

    countNode.textContent = `${items.length} ${items.length === 1 ? 'идея' : (items.length >= 2 && items.length <= 4 ? 'идеи' : 'идей')}`;

    if (!items.length) {
      listNode.innerHTML = '<p class="portal-muted">По текущему фильтру идеи не найдены.</p>';
      renderDetail(null);
      return;
    }

    listNode.innerHTML = items.map((idea) => {
      const theme = getThemeMeta(idea.theme);
      const isActive = Number(idea.id) === Number(state.selectedIdeaId);
      const liked = likedIds.has(Number(idea.id));

      return `
        <button type="button" class="idea-bank-list-item ${isActive ? 'is-active' : ''}" data-bank-idea-id="${idea.id}">
          <div class="idea-item-head">
            <h4>${escapeHtml(idea.title)}</h4>
            <span class="chip">${escapeHtml(theme.label)}</span>
          </div>
          <p>${escapeHtml(shorten(idea.description, 160))}</p>
          <div class="idea-bank-list-meta">
            <span>${escapeHtml(shorten(idea.address, 58))}</span>
            <span>Лайков: <span data-like-count-for="${idea.id}">${Number(idea.likesCount || 0)}</span></span>
            <span>${escapeHtml(formatDate(idea.createdAt))}</span>
          </div>
          <div class="idea-bank-list-foot">
            <span class="idea-link-indicator">${isActive ? 'Открыто' : 'Открыть карточку'}</span>
            <span class="idea-link-liked">${liked ? 'Лайк учтен' : 'Доступен лайк'}</span>
          </div>
        </button>
      `;
    }).join('');

    const selected = items.find((idea) => Number(idea.id) === Number(state.selectedIdeaId));
    renderDetail(selected || items[0]);
  };

  const applyFilters = () => {
    const term = normalize(searchNode.value).toLowerCase();
    const sort = normalize(sortNode.value) || 'popular';

    let items = [...state.rawIdeas];
    if (term) {
      items = items.filter((idea) => {
        const haystack = [
          idea.title,
          idea.description,
          idea.address,
          idea.authorLabel
        ].map((chunk) => normalize(chunk).toLowerCase()).join(' ');
        return haystack.includes(term);
      });
    }

    items.sort((a, b) => {
      if (sort === 'new') {
        return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
      }
      if (sort === 'old') {
        return Date.parse(a.createdAt || '') - Date.parse(b.createdAt || '');
      }

      const likesDelta = Number(b.likesCount || 0) - Number(a.likesCount || 0);
      if (likesDelta !== 0) return likesDelta;
      return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
    });

    state.filteredIdeas = items;

    if (state.needsInitialSelection) {
      state.needsInitialSelection = false;
      const exists = items.some((idea) => Number(idea.id) === Number(state.selectedIdeaId));
      if (!exists) {
        state.selectedIdeaId = items[0] ? Number(items[0].id) : null;
      }
    } else if (!items.some((idea) => Number(idea.id) === Number(state.selectedIdeaId))) {
      state.selectedIdeaId = items[0] ? Number(items[0].id) : null;
    }

    writeSelectedToUrl(state.selectedIdeaId);
    renderList();
  };

  const loadIdeas = async () => {
    if (state.loading) return;
    state.loading = true;

    listNode.innerHTML = '<p class="portal-muted">Загрузка банка идей...</p>';
    try {
      const theme = normalize(themeNode.value);
      const query = theme ? `?theme=${encodeURIComponent(theme)}` : '';
      const body = await fetchJson(`${IDEAS_ENDPOINT}${query}`);
      state.rawIdeas = Array.isArray(body.data) ? body.data : [];
      applyFilters();
    } catch (error) {
      listNode.innerHTML = `<p class="portal-error">${escapeHtml(error.message || 'Не удалось загрузить банк идей.')}</p>`;
      detailNode.innerHTML = '<p class="portal-muted">Карточка идеи временно недоступна.</p>';
      countNode.textContent = '0 идей';
    } finally {
      state.loading = false;
    }
  };

  themeNode.addEventListener('change', () => {
    loadIdeas().catch(() => {});
  });

  sortNode.addEventListener('change', () => {
    applyFilters();
  });

  let searchTimer = null;
  searchNode.addEventListener('input', () => {
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      applyFilters();
    }, 120);
  });

  page.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const likeButton = target.closest('[data-like-id]');
    if (likeButton) {
      const ideaId = Number(likeButton.getAttribute('data-like-id'));
      if (!Number.isFinite(ideaId) || ideaId <= 0) return;

      const likedIds = readLikedIdeaIds();
      if (likedIds.has(ideaId) || likeButton.dataset.liked === 'true') {
        return;
      }

      likeButton.disabled = true;
      try {
        const body = await fetchJson(`${IDEAS_ENDPOINT}/${ideaId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: getClientId()
          })
        });

        const likesCount = Number(body?.data?.likesCount || 0);
        likedIds.add(ideaId);
        saveLikedIdeaIds(likedIds);

        state.rawIdeas = updateIdeaInCollection(state.rawIdeas, ideaId, { likesCount });
        state.filteredIdeas = updateIdeaInCollection(state.filteredIdeas, ideaId, { likesCount });
        renderList();
      } catch (error) {
        likeButton.disabled = false;
        likeButton.textContent = error.message || 'Ошибка лайка';
      }

      return;
    }

    const listButton = target.closest('[data-bank-idea-id]');
    if (!listButton) return;

    const ideaId = Number(listButton.getAttribute('data-bank-idea-id'));
    if (!Number.isFinite(ideaId) || ideaId <= 0) return;

    state.selectedIdeaId = ideaId;
    writeSelectedToUrl(ideaId);
    renderList();

    if (detailCard && window.matchMedia('(max-width: 1120px)').matches) {
      detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  loadIdeas().catch(() => {});
}

