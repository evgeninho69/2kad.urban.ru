const IDEAS_ENDPOINT = '/api/tver-portal/ideas';
const PRIVACY_META_ENDPOINT = '/api/tver-portal/privacy-meta';

const LIKED_IDEAS_STORAGE_KEY = 'tverPortalLikedIdeas';
const CLIENT_ID_STORAGE_KEY = 'tverPortalIdeasClientId';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const FALLBACK_POLICY_VERSION = '2026-05-20';

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

let yandexLoaderPromise = null;

const normalize = (value) => String(value || '').trim();

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const setStatus = (node, text, tone = 'muted') => {
  if (!node) return;
  node.textContent = text;
  node.dataset.tone = tone;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || 'Ошибка запроса. Попробуйте позже.');
  }

  return body;
};

const loadPrivacyMeta = () => fetchJson(PRIVACY_META_ENDPOINT).then((body) => body.data || null);

const getThemeMeta = (theme) => THEME_META[theme] || THEME_META.other;

const formatDate = (value) => {
  const timestamp = Date.parse(String(value || ''));
  if (Number.isNaN(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString('ru-RU');
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
    // ignore storage errors
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
    // ignore storage errors
  }

  return generated;
};

const loadYandexMaps = (apiKey = '') => {
  if (window.ymaps) {
    return new Promise((resolve) => {
      window.ymaps.ready(() => resolve(window.ymaps));
    });
  }

  if (yandexLoaderPromise) return yandexLoaderPromise;

  yandexLoaderPromise = new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      lang: 'ru_RU'
    });

    if (apiKey) {
      params.set('apikey', apiKey);
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.async = true;

    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Не удалось инициализировать Яндекс.Карты.'));
        return;
      }

      window.ymaps.ready(() => resolve(window.ymaps));
    };

    script.onerror = () => {
      reject(new Error('Не удалось загрузить библиотеку Яндекс.Карт.'));
    };

    document.head.append(script);
  });

  return yandexLoaderPromise;
};

const renderIdeasLegend = (legendNode) => {
  if (!legendNode) return;

  legendNode.innerHTML = Object.values(THEME_META).map((theme) => `
    <span class="ideas-legend-item">
      <span class="dot" style="background:${escapeHtml(theme.color)}"></span>
      <span>${escapeHtml(theme.label)}</span>
    </span>
  `).join('');
};

const buildIdeaLikeControls = (idea, likedIds) => {
  const liked = likedIds.has(Number(idea.id));

  return `
    <div class="idea-like-row">
      <button
        class="idea-like-btn"
        type="button"
        data-like-id="${idea.id}"
        data-liked="${liked ? 'true' : 'false'}"
      >${liked ? 'Лайк учтен' : 'Поддержать идею'}</button>
      <span class="idea-like-count">Лайков: <span data-like-count-for="${idea.id}">${Number(idea.likesCount || 0)}</span></span>
    </div>
  `;
};

const buildIdeaImage = (idea) => {
  if (!idea.imageUrl) return '';

  return `
    <figure>
      <img src="${escapeHtml(idea.imageUrl)}" alt="Иллюстрация идеи: ${escapeHtml(idea.title)}" loading="lazy">
    </figure>
  `;
};

const buildListIdeaCard = (idea, likedIds) => {
  const theme = getThemeMeta(idea.theme);

  return `
    <article class="idea-item">
      <div class="idea-item-head">
        <h4>${escapeHtml(idea.title)}</h4>
        <span class="chip">${escapeHtml(theme.label)}</span>
      </div>
      ${buildIdeaImage(idea)}
      <p>${escapeHtml(idea.description)}</p>
      <div class="idea-item-meta">
        <span>${escapeHtml(idea.address)}</span>
        <span>${escapeHtml(formatDate(idea.createdAt))}</span>
        <span>${escapeHtml(idea.authorLabel)}</span>
      </div>
      ${buildIdeaLikeControls(idea, likedIds)}
    </article>
  `;
};

const buildBankIdeaCard = (idea, likedIds) => {
  const theme = getThemeMeta(idea.theme);

  return `
    <article class="idea-bank-card">
      <div class="idea-item-head">
        <h4>${escapeHtml(idea.title)}</h4>
        <span class="chip">${escapeHtml(theme.label)}</span>
      </div>
      ${buildIdeaImage(idea)}
      <p>${escapeHtml(idea.description)}</p>
      <div class="idea-bank-meta">
        <span>${escapeHtml(idea.address)}</span>
        <span>${escapeHtml(formatDate(idea.createdAt))}</span>
      </div>
      ${buildIdeaLikeControls(idea, likedIds)}
    </article>
  `;
};

const renderIdeaList = (ideas, listNode, likedIds) => {
  if (!listNode) return;

  if (!ideas.length) {
    listNode.innerHTML = '<p class="portal-muted">По выбранному фильтру пока нет идей.</p>';
    return;
  }

  const latestIdeas = [...ideas]
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''))
    .slice(0, 12);

  listNode.innerHTML = latestIdeas.map((idea) => buildListIdeaCard(idea, likedIds)).join('');
};

const renderIdeaBank = (ideas, bankNode, likedIds) => {
  if (!bankNode) return;

  if (!ideas.length) {
    bankNode.innerHTML = '<p class="portal-muted">Банк идей пока пуст.</p>';
    return;
  }

  const sortedIdeas = [...ideas].sort((a, b) => {
    const likesDelta = Number(b.likesCount || 0) - Number(a.likesCount || 0);
    if (likesDelta !== 0) return likesDelta;
    return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
  });

  bankNode.innerHTML = sortedIdeas.map((idea) => buildBankIdeaCard(idea, likedIds)).join('');
};

const buildBalloonHtml = (idea) => {
  const theme = getThemeMeta(idea.theme);
  const image = idea.imageUrl
    ? `<img src="${escapeHtml(idea.imageUrl)}" alt="${escapeHtml(idea.title)}" style="display:block;width:100%;max-width:240px;border-radius:10px;margin:0 0 8px;">`
    : '';

  return `
    <div style="max-width:250px;">
      <strong>${escapeHtml(idea.title)}</strong>
      <div style="margin-top:4px;color:#7a6a4b;font-size:12px;">${escapeHtml(theme.label)}</div>
      ${image}
      <div style="margin-top:4px;line-height:1.4;">${escapeHtml(idea.description)}</div>
      <div style="margin-top:6px;color:#7a6a4b;font-size:12px;">${escapeHtml(idea.address)}</div>
      <div style="margin-top:4px;color:#7a6a4b;font-size:12px;">Лайков: ${Number(idea.likesCount || 0)}</div>
    </div>
  `;
};

const syncIdeaLikeCount = (ideaId, likesCount) => {
  document.querySelectorAll(`[data-like-count-for="${ideaId}"]`).forEach((node) => {
    node.textContent = String(Number(likesCount || 0));
  });
};

const markIdeaLikedInUi = (ideaId) => {
  document.querySelectorAll(`[data-like-id="${ideaId}"]`).forEach((button) => {
    button.dataset.liked = 'true';
    button.textContent = 'Лайк учтен';
  });
};

const initIdeasMap = async (shared) => {
  const mapNode = document.querySelector('[data-ideas-map]');
  const filterNode = document.querySelector('[data-ideas-filter]');
  const listNode = document.querySelector('[data-idea-list]');
  const bankNode = document.querySelector('[data-idea-bank]');

  if (!mapNode) return;

  const centerLat = Number(mapNode.dataset.mapCenterLat || 56.8587);
  const centerLon = Number(mapNode.dataset.mapCenterLon || 35.9176);
  const startZoom = Number(mapNode.dataset.mapZoom || 11);
  const yandexApiKey = normalize(mapNode.dataset.yandexApiKey || window.TVER_YANDEX_MAPS_API_KEY || '');

  try {
    const ymaps = await loadYandexMaps(yandexApiKey);

    const map = new ymaps.Map(mapNode, {
      center: [centerLat, centerLon],
      zoom: startZoom,
      controls: ['zoomControl', 'fullscreenControl']
    }, {
      suppressMapOpenBlock: true
    });

    const ideasLayer = new ymaps.GeoObjectCollection();
    map.geoObjects.add(ideasLayer);

    const loadIdeas = async () => {
      const theme = normalize(filterNode?.value);
      const query = theme ? `?theme=${encodeURIComponent(theme)}` : '';
      const body = await fetchJson(`${IDEAS_ENDPOINT}${query}`);
      const ideas = Array.isArray(body.data) ? body.data : [];

      shared.ideas = ideas;

      const likedIds = readLikedIdeaIds();
      renderIdeaList(ideas, listNode, likedIds);
      renderIdeaBank(ideas, bankNode, likedIds);

      ideasLayer.removeAll();
      ideas.forEach((idea) => {
        const themeMeta = getThemeMeta(idea.theme);
        const placemark = new ymaps.Placemark([
          Number(idea.latitude),
          Number(idea.longitude)
        ], {
          hintContent: escapeHtml(idea.title),
          balloonContent: buildBalloonHtml(idea)
        }, {
          preset: 'islands#circleDotIcon',
          iconColor: themeMeta.color
        });

        ideasLayer.add(placemark);
      });

      return ideas;
    };

    if (filterNode) {
      filterNode.addEventListener('change', () => {
        loadIdeas().catch((error) => {
          if (listNode) {
            listNode.innerHTML = `<p class="portal-error">${escapeHtml(error.message)}</p>`;
          }
        });
      });
    }

    shared.map = map;
    shared.ymaps = ymaps;
    shared.ideasLayer = ideasLayer;
    shared.refresh = loadIdeas;

    await loadIdeas();
  } catch (error) {
    mapNode.innerHTML = `<p class="portal-error">${escapeHtml(error.message || 'Карта временно недоступна.')}</p>`;
  }
};

const readIdeaImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
  reader.readAsDataURL(file);
});

const initIdeaForm = (shared) => {
  const form = document.querySelector('[data-idea-form]');
  if (!form) return;

  const statusNode = form.querySelector('[data-idea-status]');
  const submitButton = form.querySelector('[data-idea-submit]');
  const latInput = form.querySelector('input[name="latitude"]');
  const lonInput = form.querySelector('input[name="longitude"]');
  const imageInput = form.querySelector('[data-idea-image-input]');
  const imagePreviewNode = form.querySelector('[data-idea-image-preview]');
  const imagePreviewImgNode = form.querySelector('[data-idea-image-preview-img]');

  const applyPoint = (lat, lon) => {
    if (!latInput || !lonInput) return;
    latInput.value = String(Number(lat).toFixed(6));
    lonInput.value = String(Number(lon).toFixed(6));

    if (shared.map && shared.ymaps) {
      if (!shared.pointPlacemark) {
        shared.pointPlacemark = new shared.ymaps.Placemark([lat, lon], {
          hintContent: 'Точка новой идеи'
        }, {
          preset: 'islands#darkBlueDotIcon',
          draggable: true
        });

        shared.pointPlacemark.events.add('dragend', () => {
          const coords = shared.pointPlacemark.geometry.getCoordinates();
          applyPoint(coords[0], coords[1]);
          setStatus(statusNode, 'Координаты обновлены перетаскиванием метки.', 'success');
        });

        shared.map.geoObjects.add(shared.pointPlacemark);
      } else {
        shared.pointPlacemark.geometry.setCoordinates([lat, lon]);
      }
    }
  };

  const attachMapClickHandler = () => {
    if (!shared.map || !shared.ymaps || shared.mapClickBound) return;

    shared.mapClickBound = true;
    shared.map.events.add('click', (event) => {
      const coords = event.get('coords');
      if (!Array.isArray(coords) || coords.length < 2) return;
      applyPoint(coords[0], coords[1]);
      setStatus(statusNode, 'Координаты подставлены кликом по карте.', 'success');
    });
  };

  if (shared.map) {
    attachMapClickHandler();
  } else {
    const mapWait = window.setInterval(() => {
      if (!shared.map) return;
      attachMapClickHandler();
      window.clearInterval(mapWait);
    }, 200);
  }

  if (imageInput && imagePreviewNode && imagePreviewImgNode) {
    imageInput.addEventListener('change', async () => {
      const file = imageInput.files?.[0];
      if (!file) {
        imagePreviewNode.hidden = true;
        imagePreviewImgNode.src = '';
        return;
      }

      if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
        imageInput.value = '';
        imagePreviewNode.hidden = true;
        imagePreviewImgNode.src = '';
        setStatus(statusNode, 'Допустимые форматы: PNG, JPG, WEBP.', 'error');
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        imageInput.value = '';
        imagePreviewNode.hidden = true;
        imagePreviewImgNode.src = '';
        setStatus(statusNode, 'Максимальный размер изображения: 3 МБ.', 'error');
        return;
      }

      try {
        const imageDataUrl = await readIdeaImage(file);
        imagePreviewNode.hidden = false;
        imagePreviewImgNode.src = imageDataUrl;
      } catch {
        imageInput.value = '';
        imagePreviewNode.hidden = true;
        imagePreviewImgNode.src = '';
        setStatus(statusNode, 'Не удалось подготовить превью изображения.', 'error');
      }
    });
  }

  const collectPayload = async () => {
    const data = new FormData(form);
    const file = imageInput?.files?.[0] || null;

    let ideaImageData = null;
    let ideaImageName = null;
    if (file) {
      ideaImageData = await readIdeaImage(file);
      ideaImageName = normalize(file.name || 'idea-image');
    }

    return {
      title: normalize(data.get('title')),
      description: normalize(data.get('description')),
      theme: normalize(data.get('theme')),
      latitude: Number(data.get('latitude')),
      longitude: Number(data.get('longitude')),
      address: normalize(data.get('address')),
      district: normalize(data.get('district')),
      authorName: normalize(data.get('authorName')),
      authorEmail: normalize(data.get('authorEmail')),
      authorPhone: normalize(data.get('authorPhone')),
      allowFeedback: data.get('allowFeedback') === 'on',
      consent: data.get('consent') === 'on',
      policyVersion: normalize(data.get('policyVersion')) || FALLBACK_POLICY_VERSION,
      website: normalize(data.get('website')),
      ideaImageData,
      ideaImageName
    };
  };

  const validate = (payload) => {
    if (payload.title.length < 5) return 'Укажите заголовок идеи (не менее 5 символов).';
    if (payload.description.length < 20) return 'Опишите идею подробнее (не менее 20 символов).';
    if (!payload.theme) return 'Выберите тему идеи.';
    if (Number.isNaN(payload.latitude) || payload.latitude < -90 || payload.latitude > 90) {
      return 'Укажите корректную широту.';
    }
    if (Number.isNaN(payload.longitude) || payload.longitude < -180 || payload.longitude > 180) {
      return 'Укажите корректную долготу.';
    }
    if (payload.address.length < 4) return 'Укажите адрес или ориентир.';
    if (payload.authorName.length < 2) return 'Укажите имя автора идеи.';
    if (!payload.consent) return 'Необходимо согласие на обработку персональных данных.';
    return null;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Публикация...';
    }

    try {
      const payload = await collectPayload();
      const validationError = validate(payload);

      if (validationError) {
        setStatus(statusNode, validationError, 'error');
        return;
      }

      setStatus(statusNode, 'Публикуем идею...', 'muted');

      await fetchJson(IDEAS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      form.reset();
      if (imagePreviewNode && imagePreviewImgNode) {
        imagePreviewNode.hidden = true;
        imagePreviewImgNode.src = '';
      }

      setStatus(statusNode, 'Идея опубликована и доступна на карте и в банке идей.', 'success');

      const meta = await loadPrivacyMeta();
      form.querySelectorAll('[name="policyVersion"]').forEach((input) => {
        input.value = meta?.policyVersion || '';
      });

      if (shared.refresh) {
        await shared.refresh();
      }
    } catch (error) {
      setStatus(statusNode, error.message || 'Не удалось опубликовать идею.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Опубликовать идею';
      }
    }
  });

  loadPrivacyMeta()
    .then((meta) => {
      const policyVersion = normalize(meta?.policyVersion) || FALLBACK_POLICY_VERSION;
      form.querySelectorAll('[name="policyVersion"]').forEach((input) => {
        input.value = policyVersion;
      });
      document.querySelectorAll('[data-policy-version]').forEach((node) => {
        node.textContent = policyVersion;
      });
    })
    .catch(() => {
      form.querySelectorAll('[name="policyVersion"]').forEach((input) => {
        input.value = FALLBACK_POLICY_VERSION;
      });
    });
};

const initIdeaLikes = (shared) => {
  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest('[data-like-id]');
    if (!button) return;

    const ideaId = Number(button.getAttribute('data-like-id'));
    if (!Number.isFinite(ideaId) || ideaId <= 0) return;

    const likedIds = readLikedIdeaIds();
    if (likedIds.has(ideaId) || button.dataset.liked === 'true') {
      return;
    }

    button.disabled = true;

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
      syncIdeaLikeCount(ideaId, likesCount);
      markIdeaLikedInUi(ideaId);

      if (shared.ideas && Array.isArray(shared.ideas)) {
        shared.ideas = shared.ideas.map((idea) => (
          Number(idea.id) === ideaId
            ? { ...idea, likesCount }
            : idea
        ));
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = error.message || 'Ошибка лайка';
    }
  });
};

export function initPortalIdeas() {
  const mapNode = document.querySelector('[data-ideas-map]');
  const legendNode = document.querySelector('[data-ideas-legend]');

  if (!mapNode) return;

  const shared = {
    map: null,
    ymaps: null,
    ideasLayer: null,
    pointPlacemark: null,
    refresh: null,
    ideas: []
  };

  renderIdeasLegend(legendNode);
  initIdeaForm(shared);
  initIdeaLikes(shared);

  initIdeasMap(shared).catch((error) => {
    mapNode.innerHTML = `<p class="portal-error">${escapeHtml(error.message || 'Не удалось инициализировать карту.')}</p>`;
  });
}
