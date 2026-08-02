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

// Lookup table: mojibake labels (from old form double-encoding bug) → proper UTF-8 labels.
// Only the *labels* were double-encoded; user-entered text is fine.
// We split comment by lines, and for each line, if it starts with a mojibake label,
// we replace it with the proper label.
const MOJIBAKE_LABEL_FIXES = {
  'РљРѕРјРјРµРЅС‚Р°СЂРёР№ СѓС‡Р°СЃС‚РЅРёРєР°': 'Комментарий участника',
  'РљРѕРЅС‚РµРєСЃС‚ СѓС‡Р°СЃС‚РёСЏ': 'Контекст участия',
  'РџСЂРѕР±Р»РµРјС‹ РјРѕР±РёР»СЊРЅРѕСЃС‚Рё': 'Проблемы мобильности',
  'Р’СЂРµРјСЏ РїРѕРµР·РґРєРё': 'Время поездки',
  'РђРІС‚Рѕ/РїР°СЂРєРѕРІРєРё/СЃС‚РѕСЏРЅРєРё': 'Авто/парковки/стоянки',
  'РЈРґР°С‡РЅС‹Рµ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІР°': 'Удачные пространства',
  'Р§РµРіРѕ РЅРµ С…РІР°С‚Р°РµС‚': 'Чего не хватает',
  'Р”СЂСѓРіРѕРµ РїРѕ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІР°Рј': 'Другое по пространствам',
  'РЎС„РµСЂС‹ СЃ РїСЂРѕР±Р»РµРјР°РјРё РґРѕСЃС‚СѓРїРЅРѕСЃС‚Рё': 'Сферы с проблемами доступности',
  'РќРµРґРѕСЃС‚Р°СЋС‰РёРµ РѕР±СЉРµРєС‚С‹ РІ СЂР°Р№РѕРЅРµ': 'Недостающие объекты в районе',
  'Р”РѕРї. РѕР±СЉРµРєС‚С‹ РґР»СЏ Р±Р»РёР·РѕСЃС‚Рё': 'Доп. объекты для близости',
  'Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ Рє СѓС‡Р°СЃС‚РёСЋ': 'Готовность к участию',
  'Р—Р°РЅСЏС‚РѕСЃС‚СЊ': 'Занятость',
  'Р›РѕРєР°С†РёСЏ СЂР°Р±РѕС‚С‹/СѓС‡РµР±С‹': 'Локация работы/учебы',
  'РџСЂРёРѕСЂРёС‚РµС‚С‹ СЌРєРѕРЅРѕРјРёРєРё': 'Приоритеты экономики',
  'Р‘Р°СЂСЊРµСЂС‹ РґР»СЏ Р±РёР·РЅРµСЃР°': 'Барьеры для бизнеса',
  'Р­РєРѕР»РѕРіРёС‡РµСЃРєРёРµ РїСЂРѕР±Р»РµРјС‹': 'Экологические проблемы',
  'РћР±СЉРµРєС‚С‹ РЅР°СЃР»РµРґРёСЏ': 'Объекты наследия',
  'РџСЂРёСЂРѕРґРЅС‹Рµ С‚РµСЂСЂРёС‚РѕСЂРёРё': 'Природные территории',
  'РўСѓСЂРёСЃС‚РёС‡РµСЃРєРёРµ РјР°СЂС€СЂСѓС‚С‹': 'Туристические маршруты',
  'РџРѕРµР·РґРєРё РўРІРµСЂСЊвЂ“РљР°Р»РёРЅРёРЅСЃРєРёР№ СЂР°Р№РѕРЅ': 'Поездки Тверь–Калининский район',
  'РњРµР¶С‚РµСЂСЂРёС‚РѕСЂРёР°Р»СЊРЅС‹Рµ СЃРІСЏР·Рё': 'Межтерриториальные связи',
  'РўРѕРї-3 РїСЂРѕРµРєС‚Р°': 'Топ-3 проекта',
  'Р РµР·РёРґРµРЅС‚С‹': 'Резиденты',
  'Р РµР·РёРґРµРЅС‚С‹:': 'Резиденты:',
};

function fixMojibakeInText(text) {
  if (!text) return text;
  let out = text;
  for (const [bad, good] of Object.entries(MOJIBAKE_LABEL_FIXES)) {
    if (out.indexOf(bad) !== -1) {
      out = out.split(bad).join(good);
    }
  }
  return out;
}

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const normalize = (value) => String(value || '').trim();

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

const authHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }
  return headers;
};

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

const formatDate = (value) => {
  const text = normalize(value);
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(date);
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

const SAT_COLORS = ['#d6453f', '#e89e3c', '#cfb53b', '#6da34d', '#3d8b6e'];

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
  ageGroup: normalize(controls.ageGroup?.value),
  anonymous: normalize(controls.anonymous?.value)
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
  const filterAnon = normalize(filters.anonymous);

  if (dateFromMs !== null && dateToMs !== null && dateFromMs > dateToMs) {
    return [];
  }

  return surveys.filter((survey) => {
    const surveyAge = normalize(survey?.ageGroup);
    const surveyDistrict = normalize(survey?.district);

    if (filterAge && surveyAge !== filterAge) return false;
    if (filterDistrict && surveyDistrict !== filterDistrict) return false;

    if (filterAnon === 'yes' && survey?.isAnonymous !== true) return false;
    if (filterAnon === 'no' && survey?.isAnonymous === true) return false;

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
  const satisfactionCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  let anonymousCount = 0;
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

    if (survey.isAnonymous === true) anonymousCount += 1;
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
    anonymousCount,
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

const renderBarChart = (node, entries, total, labelResolver, options = {}) => {
  if (!node) return;
  const { emptyText = 'Пока нет данных.', palette = null, unit = '' } = options;

  const data = Array.isArray(entries)
    ? entries.filter((entry) => Array.isArray(entry) && Number(entry[1]) > 0)
    : [];

  if (!data.length || total <= 0) {
    node.innerHTML = `<p class="portal-muted">${escapeHtml(emptyText)}</p>`;
    return;
  }

  const maxCount = Math.max(...data.map(([, count]) => Number(count) || 0), 1);

  node.innerHTML = data.map(([rawKey, rawCount], idx) => {
    const count = Number(rawCount) || 0;
    const share = total ? Math.round((count / total) * 100) : 0;
    const width = Math.max(8, Math.round((count / maxCount) * 100));
    const label = labelResolver(rawKey);
    const color = palette
      ? palette[idx % palette.length]
      : (rawKey === '1' || rawKey === '2' ? '#d6453f' : rawKey === '3' ? '#cfb53b' : '#3d8b6e');

    return `
      <article class="survey-bar-item">
        <div class="survey-bar-head">
          <span>${escapeHtml(label)}</span>
          <span class="survey-bar-value">${count}${unit} <span class="survey-bar-share">(${share}%)</span></span>
        </div>
        <div class="survey-bar-track">
          <span class="survey-bar-fill" style="width:${width}%; background:${color};"></span>
        </div>
      </article>
    `;
  }).join('');
};

const renderSatisfactionPie = (node, entries, total) => {
  if (!node) return;
  const data = entries.filter(([, count]) => Number(count) > 0);
  if (!data.length || total <= 0) {
    node.innerHTML = '<p class="portal-muted">Нет оценок удовлетворенности.</p>';
    return;
  }

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  let acc = 0;
  const slices = data.map(([key, count], idx) => {
    const fraction = count / total;
    const startAngle = acc * 2 * Math.PI - Math.PI / 2;
    acc += fraction;
    const endAngle = acc * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const color = SAT_COLORS[Number(key) - 1] || '#888';
    const label = resolveSatisfactionLabel(key);
    return `<path d="${d}" fill="${color}" data-key="${escapeHtml(key)}"><title>${escapeHtml(label)}: ${count} (${Math.round(fraction * 100)}%)</title></path>`;
  }).join('');

  const legend = data.map(([key, count]) => {
    const color = SAT_COLORS[Number(key) - 1] || '#888';
    const share = Math.round((count / total) * 100);
    return `<li><span class="dot" style="background:${color};"></span>${escapeHtml(resolveSatisfactionLabel(key))} — ${count} (${share}%)</li>`;
  }).join('');

  node.innerHTML = `
    <div class="survey-pie-wrap">
      <svg viewBox="0 0 ${size} ${size}" class="survey-pie" role="img" aria-label="Распределение оценок удовлетворенности">${slices}</svg>
      <ul class="survey-pie-legend">${legend}</ul>
    </div>
  `;
};

const renderTimeline = (node, surveys) => {
  if (!node) return;
  if (!surveys.length) {
    node.innerHTML = '<p class="portal-muted">Нет данных по датам.</p>';
    return;
  }

  // Group by date (YYYY-MM-DD)
  const byDate = {};
  surveys.forEach((s) => {
    const ms = parseDateToMs(s?.createdAt);
    if (ms === null) return;
    const d = new Date(ms);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDate[key] = (byDate[key] || 0) + 1;
  });
  const dates = Object.keys(byDate).sort();
  if (!dates.length) {
    node.innerHTML = '<p class="portal-muted">Нет данных по датам.</p>';
    return;
  }

  // Fill in zero days for a smoother view
  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  const allDates = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    allDates.push({ key, count: byDate[key] || 0 });
  }

  const w = 720, h = 160, pad = 28;
  const maxCount = Math.max(...allDates.map((d) => d.count), 1);
  const stepX = allDates.length > 1 ? (w - 2 * pad) / (allDates.length - 1) : 0;
  const points = allDates.map((d, i) => ({
    x: pad + i * stepX,
    y: h - pad - ((d.count / maxCount) * (h - 2 * pad)),
    count: d.count,
    key: d.key
  }));

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;

  const dots = points.filter((p) => p.count > 0).map((p) =>
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#3d8b6e"><title>${escapeHtml(p.key)}: ${p.count}</title></circle>`
  ).join('');

  // Y axis: 0, max/2, max
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];
  const yLabels = yTicks.map((v) => {
    const y = h - pad - (v / maxCount) * (h - 2 * pad);
    return `<line x1="${pad}" x2="${w - pad}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e5e1d8" stroke-dasharray="2 3" />` +
           `<text x="${pad - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#777">${v}</text>`;
  }).join('');

  // X axis: 4-5 evenly distributed labels
  const labelStep = Math.max(1, Math.floor(allDates.length / 5));
  const xLabels = allDates
    .map((d, i) => (i % labelStep === 0 || i === allDates.length - 1) ? { d, i } : null)
    .filter(Boolean)
    .map(({ d, i }) => {
      const x = pad + i * stepX;
      return `<text x="${x.toFixed(1)}" y="${h - pad + 14}" text-anchor="middle" font-size="10" fill="#777">${escapeHtml(d.key.slice(5))}</text>`;
    }).join('');

  node.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="survey-timeline" role="img" aria-label="Динамика поступления анкет">
      <defs>
        <linearGradient id="timelineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#3d8b6e" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#3d8b6e" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${yLabels}
      <path d="${areaPath}" fill="url(#timelineFill)"></path>
      <path d="${linePath}" stroke="#3d8b6e" stroke-width="2" fill="none"></path>
      ${dots}
      ${xLabels}
    </svg>
    <p class="portal-muted survey-timeline-meta">Всего дней с активностью: ${dates.length}, макс. за день: ${maxCount}.</p>
  `;
};

const truncate = (value, maxLength = 280) => {
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
      const isAnon = survey.isAnonymous === true;
      const fixedComment = fixMojibakeInText(survey.comment || '');

      return `
        <article class="survey-recent-item ${isAnon ? 'is-anonymous' : 'is-identified'}">
          <header>
            <h4>${isAnon ? 'Анонимный участник' : escapeHtml(survey.fullName || 'Участник')}</h4>
            <span class="survey-recent-meta-line">
              ${isAnon ? '<span class="chip chip-anon">анонимно</span>' : '<span class="chip chip-id">с контактами</span>'}
              <span>${escapeHtml(formatDateTime(survey.createdAt))}</span>
            </span>
          </header>
          <p>${escapeHtml(truncate(fixedComment)) || 'Комментарий не указан.'}</p>
          <div class="survey-recent-meta">
            <span>Возраст: ${escapeHtml(resolveAgeLabel(normalize(survey.ageGroup)))}</span>
            <span>Район: ${escapeHtml(normalize(survey.district) || '—')}</span>
            <span>Темы: ${escapeHtml(topics)}</span>
            <span>Оценка: ${escapeHtml(String(survey.satisfaction || '—'))} / 5</span>
            ${normalize(survey.priorityProject) ? `<span>Приоритет: ${escapeHtml(survey.priorityProject)}</span>` : ''}
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
    anonymous: root.querySelector('[data-survey-kpi="anonymous"]'),
    avgSatisfaction: root.querySelector('[data-survey-kpi="avgSatisfaction"]'),
    withEmail: root.querySelector('[data-survey-kpi="withEmail"]'),
    withPriority: root.querySelector('[data-survey-kpi="withPriority"]'),
    districts: root.querySelector('[data-survey-kpi="districts"]')
  };

  if (kpiNodes.total) kpiNodes.total.textContent = String(stats.total);
  if (kpiNodes.anonymous) {
    const share = stats.total ? Math.round((stats.anonymousCount / stats.total) * 100) : 0;
    kpiNodes.anonymous.textContent = `${stats.anonymousCount} (${share}%)`;
  }
  if (kpiNodes.avgSatisfaction) {
    kpiNodes.avgSatisfaction.textContent = stats.total
      ? `${stats.averageSatisfaction.toFixed(2)} / 5`
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
  const satisfactionPieNode = root.querySelector('[data-survey-chart="satisfaction-pie"]');
  const timelineNode = root.querySelector('[data-survey-chart="timeline"]');
  const recentNode = root.querySelector('[data-admin-surveys-recent]');

  renderBarChart(ageChartNode, stats.ageEntries, stats.total, resolveAgeLabel, { emptyText: 'Нет распределения по возрасту.' });
  renderBarChart(districtChartNode, stats.districtEntries.slice(0, 10), stats.total, (key) => key, { emptyText: 'Нет распределения по районам.' });
  renderBarChart(topicChartNode, stats.topicEntries, stats.total, resolveTopicLabel, { emptyText: 'Нет распределения по темам.' });
  renderBarChart(satisfactionChartNode, stats.satisfactionEntries, stats.total, resolveSatisfactionLabel, {
    emptyText: 'Нет оценок удовлетворенности.',
    palette: SAT_COLORS
  });
  if (satisfactionPieNode) {
    renderSatisfactionPie(satisfactionPieNode, stats.satisfactionEntries, stats.total);
  }
  if (timelineNode) {
    renderTimeline(timelineNode, surveys);
  }
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
    'ID', 'Дата и время', 'Анонимная', 'Возраст', 'Район', 'Тип района',
    'Темы', 'Контекст участия', 'Приоритетный проект', 'Оценка', 'Комментарий'
  ];

  const formatChecked = (list) => Array.isArray(list)
    ? list.map((item) => normalize(item)).filter(Boolean).join(', ')
    : '';

  const rows = surveys.map((survey) => {
    const topics = Array.isArray(survey.topics)
      ? survey.topics.map((topic) => resolveTopicLabel(normalize(topic))).join(', ')
      : '';
    const ctx = Array.isArray(survey.participantContext)
      ? survey.participantContext.join(', ')
      : '';
    const fixedComment = fixMojibakeInText(normalize(survey.comment));

    return [
      survey.id ?? '',
      formatDateTime(survey.createdAt),
      survey.isAnonymous ? 'да' : 'нет',
      resolveAgeLabel(normalize(survey.ageGroup)),
      normalize(survey.district),
      survey.districtChoice || '',
      topics,
      ctx,
      normalize(survey.priorityProject),
      survey.satisfaction ?? '',
      fixedComment
    ];
  });

  if (typeof console !== 'undefined' && console.warn) {
    rows.forEach((row, idx) => {
      if (row.length !== header.length) {
        console.warn(`[portal-admin] survey #${surveys[idx]?.id ?? idx}: колонок ${row.length}, ожидалось ${header.length}`);
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
    anonymous: root.querySelector('[data-survey-filter="anonymous"]'),
    reset: root.querySelector('[data-survey-filter-reset]'),
    meta: root.querySelector('[data-survey-filter-meta]')
  };

  let surveysCache = [];
  let filteredSurveysCache = [];

  const readToken = () => normalize(tokenInput?.value || localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '');

  const saveToken = (token) => {
    if (!token) {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      return;
    }
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  };

  const loadAnalytics = async () => {
    const token = readToken();
    const body = await fetchJson(ANALYTICS_ENDPOINT, {
      headers: authHeaders(token)
    });
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
    if (!token) throw new Error('Сначала укажите admin токен.');

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
    if (!token) throw new Error('Сначала укажите admin токен.');

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
    surveyFilterControls.ageGroup,
    surveyFilterControls.anonymous
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
      if (surveyFilterControls.anonymous) surveyFilterControls.anonymous.value = '';
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

  // Только если есть токен — пытаемся сразу загрузить аналитику.
  // Иначе ждём, пока пользователь введёт токен и нажмёт «Загрузить данные».
  if (readToken()) {
    loadAnalytics()
      .then(() => {
        setStatus(statusNode, 'Аналитика загружена. Для модерации/выгрузки используйте кнопку «Загрузить данные».', 'muted');
      })
      .catch((error) => {
        setStatus(statusNode, error.message || 'Не удалось загрузить аналитику.', 'error');
      });
  } else {
    setStatus(statusNode, 'Укажите admin токен и нажмите «Загрузить данные».', 'muted');
  }
}
