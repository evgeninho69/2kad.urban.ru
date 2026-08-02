const ANALYTICS_ENDPOINT = '/api/tver-portal/analytics';
const SURVEYS_ENDPOINT = '/api/tver-portal/surveys';
const MODERATION_IDEAS_ENDPOINT = '/api/tver-portal/moderation/ideas';
const PERSONAL_DATA_REQUESTS_ENDPOINT = '/api/tver-portal/personal-data/requests';

const ADMIN_TOKEN_STORAGE_KEY = 'tverPortalAdminToken';
const MAX_RECENT_SURVEYS = 12;

const AGE_GROUP_LABELS = {
  under_18: 'До 18 лет',
  '18_30': '18-30 лет',
  '31_45': '31-45 лет',
  '46_60': '46-60 лет',
  '60_plus': '60+ лет'
};

const TOPIC_LABELS = {
  transport: 'Транспорт',
  ecology: 'Экология',
  landscaping: 'Благоустройство',
  housing: 'Жилье и застройка',
  social: 'Социальная инфраструктура',
  economy: 'Экономика и рабочие места',
  culture: 'Культура и общественная жизнь',
  mobility: 'Пешеходная и веломобильность'
};

const SATISFACTION_LABELS = {
  '1': '1 - очень низко',
  '2': '2 - ниже среднего',
  '3': '3 - удовлетворительно',
  '4': '4 - хорошо',
  '5': '5 - отлично'
};

const AGE_GROUP_ORDER = ['under_18', '18_30', '31_45', '46_60', '60_plus', 'unknown'];

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const normalize = (value) => String(value || '').trim();
const normalizeToken = (value) => normalize(value);

const setStatus = (node, text, tone = 'muted') => {
  if (!node) return;
  node.textContent = text;
  node.dataset.tone = tone;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || 'Ошибка запроса.');
  }

  return body;
};

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  'X-Admin-Token': token
});

const formatObjectSummary = (value) => {
  if (!value || typeof value !== 'object') return '—';

  const entries = Object.entries(value);
  if (!entries.length) return '—';

  return entries
    .map(([key, amount]) => `${key}: ${amount}`)
    .join(' · ');
};

const formatDateTime = (value) => {
  const text = normalize(value);
  if (!text) return '—';

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

const formatPercent = (count, total) => {
  if (!total) return '0%';
  return `${Math.round((count / total) * 100)}%`;
};

const incrementCounter = (target, key, amount = 1) => {
  if (!key) return;
  target[key] = (target[key] || 0) + amount;
};

const sortByCountDesc = (counters) => Object.entries(counters)
  .sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return String(a[0]).localeCompare(String(b[0]), 'ru-RU');
  });

const resolveAgeLabel = (key) => AGE_GROUP_LABELS[key] || key || 'Не указано';
const resolveTopicLabel = (key) => TOPIC_LABELS[key] || key || 'Другое';
const resolveSatisfactionLabel = (key) => SATISFACTION_LABELS[key] || key;

const parseDateToMs = (value) => {
  const text = normalize(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseFilterDateToMs = (dateText, isEndOfDay = false) => {
  const text = normalize(dateText);
  if (!text) return null;
  const parsed = Date.parse(`${text}T00:00:00`);
  if (!Number.isFinite(parsed)) return null;
  return isEndOfDay ? parsed + (24 * 60 * 60 * 1000) - 1 : parsed;
};

const collectSurveyFilters = (controls) => ({
  dateFrom: normalize(controls.dateFrom?.value),
  dateTo: normalize(controls.dateTo?.value),
  district: normalize(controls.district?.value),
  ageGroup: normalize(controls.ageGroup?.value)
});

const setSurveyFilterMeta = (node, filteredCount, totalCount) => {
  if (!node) return;
  node.textContent = `Показано ${filteredCount} из ${totalCount} анкет.`;
};

const applySurveyFilters = (surveys, filters) => {
  const dateFromMs = parseFilterDateToMs(filters.dateFrom, false);
  const dateToMs = parseFilterDateToMs(filters.dateTo, true);
  const filterDistrict = normalize(filters.district);
  const filterAge = normalize(filters.ageGroup);

  if (dateFromMs !== null && dateToMs !== null && dateFromMs > dateToMs) {
    return [];
  }

  return surveys.filter((survey) => {
    const surveyAge = normalize(survey?.ageGroup);
    const surveyDistrict = normalize(survey?.district);

    if (filterAge && surveyAge !== filterAge) return false;
    if (filterDistrict && surveyDistrict !== filterDistrict) return false;

    if (dateFromMs !== null || dateToMs !== null) {
      const createdAtMs = parseDateToMs(survey?.createdAt);
      if (createdAtMs === null) return false;
      if (dateFromMs !== null && createdAtMs < dateFromMs) return false;
      if (dateToMs !== null && createdAtMs > dateToMs) return false;
    }

    return true;
  });
};

const setSelectOptions = (selectNode, options, defaultLabel) => {
  if (!selectNode) return;
  selectNode.innerHTML = [
    `<option value="">${escapeHtml(defaultLabel)}</option>`,
    ...options.map(({ value, label }) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
  ].join('');
};

const fillSurveyFilterOptions = (controls, surveys) => {
  const selectedDistrict = normalize(controls.district?.value);
  const selectedAge = normalize(controls.ageGroup?.value);

  const districts = Array.from(new Set(
    surveys
      .map((survey) => normalize(survey?.district))
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'ru-RU'));

  const districtOptions = districts.map((district) => ({
    value: district,
    label: district
  }));
  setSelectOptions(controls.district, districtOptions, 'Все территории');

  const ageKeysInData = new Set(
    surveys
      .map((survey) => normalize(survey?.ageGroup))
      .filter(Boolean)
  );

  const orderedAgeKeys = AGE_GROUP_ORDER.filter((key) => key !== 'unknown' || ageKeysInData.has('unknown'));
  const extraAgeKeys = Array.from(ageKeysInData).filter((key) => !orderedAgeKeys.includes(key));
  const allAgeKeys = [...orderedAgeKeys, ...extraAgeKeys];

  const ageOptions = allAgeKeys.map((ageKey) => ({
    value: ageKey,
    label: resolveAgeLabel(ageKey)
  }));
  setSelectOptions(controls.ageGroup, ageOptions, 'Все возрастные группы');

  if (controls.district) {
    controls.district.value = districtOptions.some((option) => option.value === selectedDistrict)
      ? selectedDistrict
      : '';
  }
  if (controls.ageGroup) {
    controls.ageGroup.value = ageOptions.some((option) => option.value === selectedAge)
      ? selectedAge
      : '';
  }
};

const buildSurveyStats = (surveys) => {
  const ageCounts = {};
  const districtCounts = {};
  const topicCounts = {};
  const satisfactionCounts = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0
  };

  let withEmail = 0;
  let withPriorityProject = 0;
  let satisfactionSum = 0;
  let satisfactionCount = 0;

  surveys.forEach((survey) => {
    if (!survey || typeof survey !== 'object') return;

    const ageGroup = normalize(survey.ageGroup);
    const district = normalize(survey.district);
    const email = normalize(survey.email);
    const priorityProject = normalize(survey.priorityProject);

    if (email) withEmail += 1;
    if (priorityProject) withPriorityProject += 1;

    incrementCounter(ageCounts, ageGroup || 'unknown');
    incrementCounter(districtCounts, district || 'Не указан');

    const topics = Array.isArray(survey.topics) ? survey.topics : [];
    topics.forEach((topic) => incrementCounter(topicCounts, normalize(topic) || 'other'));

    const satisfaction = Number(survey.satisfaction);
    if (Number.isFinite(satisfaction) && satisfaction >= 1 && satisfaction <= 5) {
      const key = String(Math.round(satisfaction));
      incrementCounter(satisfactionCounts, key);
      satisfactionSum += satisfaction;
      satisfactionCount += 1;
    }
  });

  return {
    total: surveys.length,
    withEmail,
    withPriorityProject,
    averageSatisfaction: satisfactionCount ? (satisfactionSum / satisfactionCount) : 0,
    districtsTotal: Object.keys(districtCounts).length,
    ageEntries: sortByCountDesc(ageCounts).filter(([key]) => key !== 'unknown').concat(
      ageCounts.unknown ? [['unknown', ageCounts.unknown]] : []
    ),
    districtEntries: sortByCountDesc(districtCounts),
    topicEntries: sortByCountDesc(topicCounts),
    satisfactionEntries: ['1', '2', '3', '4', '5'].map((key) => [key, satisfactionCounts[key] || 0])
  };
};

const renderBarChart = (node, entries, total, labelResolver, emptyText = 'Пока нет данных.') => {
  if (!node) return;

  const data = Array.isArray(entries)
    ? entries.filter((entry) => Array.isArray(entry) && Number(entry[1]) > 0)
    : [];

  if (!data.length || total <= 0) {
    node.innerHTML = `<p class="portal-muted">${escapeHtml(emptyText)}</p>`;
    return;
  }

  const maxCount = Math.max(...data.map(([, count]) => Number(count) || 0), 1);

  node.innerHTML = data.map(([rawKey, rawCount]) => {
    const count = Number(rawCount) || 0;
    const share = total ? Math.round((count / total) * 100) : 0;
    const width = Math.max(10, Math.round((count / maxCount) * 100));
    const label = labelResolver(rawKey);

    return `
      <article class="survey-bar-item">
        <div class="survey-bar-head">
          <span>${escapeHtml(label)}</span>
          <span>${count} (${share}%)</span>
        </div>
        <div class="survey-bar-track"><span style="width:${width}%"></span></div>
      </article>
    `;
  }).join('');
};

const truncate = (value, maxLength = 180) => {
  const text = normalize(value).replace(/\r?\n+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
};

const renderRecentSurveys = (surveys, node) => {
  if (!node) return;

  if (!surveys.length) {
    node.innerHTML = '<p class="portal-muted">Анкеты еще не поступали.</p>';
    return;
  }

  node.innerHTML = surveys
    .slice(0, MAX_RECENT_SURVEYS)
    .map((survey) => {
      const topics = Array.isArray(survey.topics) && survey.topics.length
        ? survey.topics.map((topic) => resolveTopicLabel(normalize(topic))).join(', ')
        : '—';

      return `
        <article class="survey-recent-item">
          <header>
            <h4>${escapeHtml(normalize(survey.fullName) || 'Участник')}</h4>
            <span>${escapeHtml(formatDateTime(survey.createdAt))}</span>
          </header>
          <p>${escapeHtml(truncate(survey.comment || '')) || 'Комментарий не указан.'}</p>
          <div class="survey-recent-meta">
            <span>Возраст: ${escapeHtml(resolveAgeLabel(normalize(survey.ageGroup)))}</span>
            <span>Район: ${escapeHtml(normalize(survey.district) || '—')}</span>
            <span>Темы: ${escapeHtml(topics)}</span>
            <span>Оценка: ${escapeHtml(String(survey.satisfaction || '—'))}</span>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderSurveyDashboard = (surveys, root) => {
  const stats = buildSurveyStats(surveys);

  const kpiNodes = {
    total: root.querySelector('[data-survey-kpi="total"]'),
    avgSatisfaction: root.querySelector('[data-survey-kpi="avgSatisfaction"]'),
    withEmail: root.querySelector('[data-survey-kpi="withEmail"]'),
    withPriority: root.querySelector('[data-survey-kpi="withPriority"]'),
    districts: root.querySelector('[data-survey-kpi="districts"]')
  };

  if (kpiNodes.total) kpiNodes.total.textContent = String(stats.total);
  if (kpiNodes.avgSatisfaction) {
    kpiNodes.avgSatisfaction.textContent = stats.total
      ? `${stats.averageSatisfaction.toFixed(1)} / 5`
      : '—';
  }
  if (kpiNodes.withEmail) {
    kpiNodes.withEmail.textContent = `${stats.withEmail} (${formatPercent(stats.withEmail, stats.total)})`;
  }
  if (kpiNodes.withPriority) {
    kpiNodes.withPriority.textContent = `${stats.withPriorityProject} (${formatPercent(stats.withPriorityProject, stats.total)})`;
  }
  if (kpiNodes.districts) {
    kpiNodes.districts.textContent = String(stats.districtsTotal || 0);
  }

  const ageChartNode = root.querySelector('[data-survey-chart="age"]');
  const districtChartNode = root.querySelector('[data-survey-chart="district"]');
  const topicChartNode = root.querySelector('[data-survey-chart="topic"]');
  const satisfactionChartNode = root.querySelector('[data-survey-chart="satisfaction"]');
  const recentNode = root.querySelector('[data-admin-surveys-recent]');

  renderBarChart(ageChartNode, stats.ageEntries, stats.total, resolveAgeLabel, 'Нет распределения по возрасту.');
  renderBarChart(districtChartNode, stats.districtEntries.slice(0, 10), stats.total, (key) => key, 'Нет распределения по районам.');
  renderBarChart(topicChartNode, stats.topicEntries, stats.total, resolveTopicLabel, 'Нет распределения по темам.');
  renderBarChart(satisfactionChartNode, stats.satisfactionEntries, stats.total, resolveSatisfactionLabel, 'Нет оценок удовлетворенности.');
  renderRecentSurveys(surveys, recentNode);
};

const renderAnalytics = (data, root) => {
  if (!root) return;

  const mappings = {
    surveysTotal: data.surveysTotal,
    ideasTotal: data.ideasTotal,
    ideasByStatus: formatObjectSummary(data.ideasByStatus),
    approvedByTheme: formatObjectSummary(data.approvedByTheme),
    personalDataRequestsTotal: data.personalDataRequestsTotal,
    personalDataRequestsByStatus: formatObjectSummary(data.personalDataRequestsByStatus),
    policyVersion: data.policyVersion,
    retentionDays: `${data.retentionDays} дней`
  };

  root.querySelectorAll('[data-analytics-key]').forEach((node) => {
    const key = node.getAttribute('data-analytics-key');
    node.textContent = key && key in mappings ? String(mappings[key]) : '—';
  });
};

const renderModerationIdeas = (ideas, node) => {
  if (!node) return;

  if (!ideas.length) {
    node.innerHTML = '<p class="portal-muted">Нет идей в очереди модерации.</p>';
    return;
  }

  node.innerHTML = ideas.map((idea) => `
    <article class="admin-card" data-admin-idea-id="${idea.id}">
      <header>
        <h4>${escapeHtml(idea.title)}</h4>
        <span class="chip">${escapeHtml(idea.status)}</span>
      </header>
      <p>${escapeHtml(idea.description)}</p>
      <p class="portal-muted">${escapeHtml(idea.address)} · ${escapeHtml(idea.authorName)}${idea.authorEmail ? ` · ${escapeHtml(idea.authorEmail)}` : ''}</p>
      <label class="form-field">
        <span>Комментарий модератора</span>
        <textarea rows="3" data-admin-comment>${escapeHtml(idea.moderatorComment || '')}</textarea>
      </label>
      <div class="admin-actions">
        <button class="btn btn-ghost" type="button" data-admin-action="approved">Опубликовать</button>
        <button class="btn btn-ghost" type="button" data-admin-action="needs_revision">На доработку</button>
        <button class="btn btn-ghost" type="button" data-admin-action="rejected">Отклонить</button>
      </div>
    </article>
  `).join('');
};

const renderPersonalDataRequests = (requests, node) => {
  if (!node) return;

  if (!requests.length) {
    node.innerHTML = '<p class="portal-muted">Нет зарегистрированных запросов субъектов ПДн.</p>';
    return;
  }

  node.innerHTML = requests.map((item) => `
    <article class="admin-card" data-admin-pd-id="${item.id}">
      <header>
        <h4>${escapeHtml(item.fullName)}</h4>
        <span class="chip">${escapeHtml(item.status)}</span>
      </header>
      <p><strong>Тип запроса:</strong> ${escapeHtml(item.requestType)}</p>
      <p>${escapeHtml(item.message)}</p>
      <p class="portal-muted">${escapeHtml(item.email || 'email не указан')}${item.phone ? ` · ${escapeHtml(item.phone)}` : ''}</p>
      <label class="form-field">
        <span>Комментарий оператора</span>
        <textarea rows="3" data-admin-pd-comment>${escapeHtml(item.operatorComment || '')}</textarea>
      </label>
      <div class="admin-actions">
        <button class="btn btn-ghost" type="button" data-admin-pd-action="in_progress">В работу</button>
        <button class="btn btn-ghost" type="button" data-admin-pd-action="completed">Исполнено</button>
        <button class="btn btn-ghost" type="button" data-admin-pd-action="rejected">Отклонено</button>
      </div>
    </article>
  `).join('');
};

const toCsvCell = (value) => {
  const text = String(value ?? '').replace(/\r?\n+/g, ' ');
  return `"${text.replaceAll('"', '""')}"`;
};

const buildSurveysCsv = (surveys) => {
  const header = [
    'ID',
    'Дата и время',
    'Анонимная',
    'Возрастная группа',
    'Район',
    'Темы развития',
    'Проблемы мобильности',
    'Удобство поездок',
    'Проблемы с парковкой',
    'Любимые пространства',
    'Где не хватает пространств',
    'Доступность соц. объектов',
    'Каких объектов не хватает',
    'Качество взаимодействия',
    'Готовность участвовать',
    'Занятость',
    'Приоритеты экономики',
    'Барьеры для бизнеса',
    'Экологические проблемы',
    'Исторические места',
    'Природные территории',
    'Туристические маршруты',
    'Частота поездок',
    'Что улучшить в связях',
    'Приоритетный проект',
    'Топ-3 проекта',
    'Оценка удовлетворённости',
    'Комментарий'
  ];

  // ...и порядок колонок должен совпадать с row[]. Ниже есть assert при экспорте.

  const formatChecked = (list) => Array.isArray(list)
    ? list.map((item) => normalize(item)).filter(Boolean).join(', ')
    : '';

  const rows = surveys.map((survey) => {
    const topics = Array.isArray(survey.topics)
      ? survey.topics.map((topic) => resolveTopicLabel(normalize(topic))).join(', ')
      : '';
    const transportProblems = Array.isArray(survey.transportProblems)
      ? survey.transportProblems.join(', ')
      : '';
    const carParking = Array.isArray(survey.carParkingIssues)
      ? survey.carParkingIssues.join(', ')
      : '';
    const spacesMissing = Array.isArray(survey.spacesMissing)
      ? survey.spacesMissing.join(', ')
      : '';
    const socialAccess = Array.isArray(survey.socialAccessSectors)
      ? survey.socialAccessSectors.join(', ')
      : '';
    const socialObjects = Array.isArray(survey.socialObjectNeeds)
      ? survey.socialObjectNeeds.join(', ')
      : '';
    const participantCtx = Array.isArray(survey.participantContext)
      ? survey.participantContext.join(', ')
      : '';
    const economyP = Array.isArray(survey.economyPriorities)
      ? survey.economyPriorities.join(', ')
      : '';
    const businessB = Array.isArray(survey.businessBarriers)
      ? survey.businessBarriers.join(', ')
      : '';
    const ecologyP = Array.isArray(survey.ecologyProblems)
      ? survey.ecologyProblems.join(', ')
      : '';
    const intermun = Array.isArray(survey.intermunicipalNeeds)
      ? survey.intermunicipalNeeds.join(', ')
      : '';

    return [
      survey.id ?? '',
      formatDateTime(survey.createdAt),
      survey.isAnonymous ? 'да' : 'нет',
      resolveAgeLabel(normalize(survey.ageGroup)),
      normalize(survey.district),
      topics,
      transportProblems,
      normalize(survey.commuteTime),
      carParking,
      normalize(survey.placesLove),
      spacesMissing,
      socialAccess,
      socialObjects,
      participantCtx,
      normalize(survey.ideaReady),
      normalize(survey.employmentStatus),
      economyP,
      businessB,
      ecologyP,
      normalize(survey.heritageObjects),
      normalize(survey.naturePlaces),
      normalize(survey.tourismRoutes),
      normalize(survey.agglomerationTrips),
      intermun,
      normalize(survey.priorityProject),
      normalize(survey.topProjects),
      survey.satisfaction ?? '',
      normalize(survey.comment)
    ];
  });

  if (typeof console !== 'undefined' && console.warn) {
    rows.forEach((row, idx) => {
      if (row.length !== header.length) {
        console.warn(`[portal-admin] survey #${surveys[idx]?.id ?? idx}: колонок ${row.length}, ожидалось ${header.length} (${header.length})`);
      }
    });
  }

  return [header, ...rows]
    .map((row) => row.map((cell) => toCsvCell(cell)).join(';'))
    .join('\r\n');
};

const downloadTextFile = (fileName, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
};

export function initPortalAdmin() {
  const root = document.querySelector('[data-portal-admin]');
  if (!root) return;

  const tokenInput = root.querySelector('[data-admin-token]');
  const loadButton = root.querySelector('[data-admin-load]');
  const statusNode = root.querySelector('[data-admin-status]');
  const moderationNode = root.querySelector('[data-admin-moderation-list]');
  const pdRequestsNode = root.querySelector('[data-admin-pd-list]');
  const analyticsNode = root.querySelector('[data-admin-analytics]');
  const surveyExportPanel = root.querySelector('[data-admin-surveys]');
  const surveyFilterControls = {
    dateFrom: root.querySelector('[data-survey-filter="dateFrom"]'),
    dateTo: root.querySelector('[data-survey-filter="dateTo"]'),
    district: root.querySelector('[data-survey-filter="district"]'),
    ageGroup: root.querySelector('[data-survey-filter="ageGroup"]'),
    reset: root.querySelector('[data-survey-filter-reset]'),
    meta: root.querySelector('[data-survey-filter-meta]')
  };

  let surveysCache = [];
  let filteredSurveysCache = [];

  const readToken = () => normalizeToken(tokenInput?.value || localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '');

  const saveToken = (token) => {
    if (!token) {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      return;
    }

    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  };

  const loadAnalytics = async () => {
    const body = await fetchJson(ANALYTICS_ENDPOINT);
    renderAnalytics(body.data || {}, analyticsNode);
  };

  const refreshSurveyDashboard = () => {
    const filters = collectSurveyFilters(surveyFilterControls);
    filteredSurveysCache = applySurveyFilters(surveysCache, filters);
    renderSurveyDashboard(filteredSurveysCache, root);
    setSurveyFilterMeta(surveyFilterControls.meta, filteredSurveysCache.length, surveysCache.length);
  };

  const loadProtectedData = async (token) => {
    const [ideasBody, pdBody, surveysBody] = await Promise.all([
      fetchJson(`${MODERATION_IDEAS_ENDPOINT}?limit=200`, {
        headers: authHeaders(token)
      }),
      fetchJson(`${PERSONAL_DATA_REQUESTS_ENDPOINT}?limit=200`, {
        headers: authHeaders(token)
      }),
      fetchJson(SURVEYS_ENDPOINT, {
        headers: authHeaders(token)
      })
    ]);

    surveysCache = Array.isArray(surveysBody.data) ? surveysBody.data : [];
    fillSurveyFilterOptions(surveyFilterControls, surveysCache);

    renderModerationIdeas(ideasBody.data || [], moderationNode);
    renderPersonalDataRequests(pdBody.data || [], pdRequestsNode);
    refreshSurveyDashboard();
  };

  const exportSurveys = (format) => {
    if (!filteredSurveysCache.length) {
      throw new Error('Нет анкет по текущему фильтру. Измените фильтр или загрузите данные.');
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const scope = filteredSurveysCache.length === surveysCache.length ? 'all' : 'filtered';

    if (format === 'csv') {
      const csvBody = buildSurveysCsv(filteredSurveysCache);
      downloadTextFile(
        `tver-surveys-${scope}-${stamp}.csv`,
        `\uFEFF${csvBody}`,
        'text/csv;charset=utf-8'
      );
      return;
    }

    const jsonBody = JSON.stringify(filteredSurveysCache, null, 2);
    downloadTextFile(
      `tver-surveys-${scope}-${stamp}.json`,
      jsonBody,
      'application/json;charset=utf-8'
    );
  };

  const refreshAll = async () => {
    const token = readToken();

    if (!token) {
      setStatus(statusNode, 'Укажите admin токен для модерации.', 'error');
      return;
    }

    saveToken(token);
    setStatus(statusNode, 'Загружаем данные...', 'muted');

    try {
      await Promise.all([loadAnalytics(), loadProtectedData(token)]);
      setStatus(
        statusNode,
        `Данные обновлены. Анкет: ${surveysCache.length}, по фильтру: ${filteredSurveysCache.length}.`,
        'success'
      );
    } catch (error) {
      setStatus(statusNode, error.message || 'Не удалось загрузить данные.', 'error');
    }
  };

  const moderateIdea = async (ideaId, action, comment) => {
    const token = readToken();
    if (!token) {
      throw new Error('Сначала укажите admin токен.');
    }

    await fetchJson(`${MODERATION_IDEAS_ENDPOINT}/${ideaId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({
        status: action,
        moderatorComment: comment || 'Статус изменен модератором.'
      })
    });
  };

  const resolvePersonalDataRequest = async (requestId, action, comment) => {
    const token = readToken();
    if (!token) {
      throw new Error('Сначала укажите admin токен.');
    }

    await fetchJson(`${PERSONAL_DATA_REQUESTS_ENDPOINT}/${requestId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({
        status: action,
        operatorComment: comment || 'Запрос обработан оператором.'
      })
    });
  };

  if (tokenInput) {
    tokenInput.value = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
  }

  renderSurveyDashboard([], root);
  setSurveyFilterMeta(surveyFilterControls.meta, 0, 0);

  const filterInputs = [
    surveyFilterControls.dateFrom,
    surveyFilterControls.dateTo,
    surveyFilterControls.district,
    surveyFilterControls.ageGroup
  ].filter(Boolean);

  filterInputs.forEach((input) => {
    input.addEventListener('change', () => {
      refreshSurveyDashboard();
    });
  });

  if (surveyFilterControls.reset) {
    surveyFilterControls.reset.addEventListener('click', () => {
      if (surveyFilterControls.dateFrom) surveyFilterControls.dateFrom.value = '';
      if (surveyFilterControls.dateTo) surveyFilterControls.dateTo.value = '';
      if (surveyFilterControls.district) surveyFilterControls.district.value = '';
      if (surveyFilterControls.ageGroup) surveyFilterControls.ageGroup.value = '';
      refreshSurveyDashboard();
    });
  }

  if (loadButton) {
    loadButton.addEventListener('click', () => {
      refreshAll();
    });
  }

  if (surveyExportPanel) {
    surveyExportPanel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-survey-export]');
      if (!button) return;

      const format = normalize(button.getAttribute('data-survey-export'));
      if (!format) return;

      try {
        exportSurveys(format);
        setStatus(statusNode, `Выгрузка ${format.toUpperCase()} сформирована.`, 'success');
      } catch (error) {
        setStatus(statusNode, error.message || 'Не удалось сформировать выгрузку.', 'error');
      }
    });
  }

  if (moderationNode) {
    moderationNode.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-admin-action]');
      if (!button) return;

      const card = button.closest('[data-admin-idea-id]');
      if (!card) return;

      const ideaId = card.getAttribute('data-admin-idea-id');
      const action = button.getAttribute('data-admin-action');
      const comment = card.querySelector('[data-admin-comment]')?.value || '';

      setStatus(statusNode, 'Сохраняем решение модератора...', 'muted');

      try {
        await moderateIdea(ideaId, action, comment);
        await refreshAll();
        setStatus(statusNode, 'Решение модератора сохранено.', 'success');
      } catch (error) {
        setStatus(statusNode, error.message || 'Не удалось сохранить решение.', 'error');
      }
    });
  }

  if (pdRequestsNode) {
    pdRequestsNode.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-admin-pd-action]');
      if (!button) return;

      const card = button.closest('[data-admin-pd-id]');
      if (!card) return;

      const requestId = card.getAttribute('data-admin-pd-id');
      const action = button.getAttribute('data-admin-pd-action');
      const comment = card.querySelector('[data-admin-pd-comment]')?.value || '';

      setStatus(statusNode, 'Сохраняем статус запроса ПДн...', 'muted');

      try {
        await resolvePersonalDataRequest(requestId, action, comment);
        await refreshAll();
        setStatus(statusNode, 'Статус запроса ПДн обновлен.', 'success');
      } catch (error) {
        setStatus(statusNode, error.message || 'Не удалось обновить статус запроса.', 'error');
      }
    });
  }

  loadAnalytics()
    .then(() => {
      setStatus(statusNode, 'Аналитика загружена. Для дашборда опросов и модерации укажите admin токен.', 'muted');
    })
    .catch((error) => {
      setStatus(statusNode, error.message || 'Не удалось загрузить аналитику.', 'error');
    });
}
