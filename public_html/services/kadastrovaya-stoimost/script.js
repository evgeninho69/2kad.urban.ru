const RASCHET_YEAR = 2026;
const THRESHOLD = 300000000;

const REGISTRY_API_BASE = "https://nspd.gov.ru/api/data-fund/v1";
const REGISTRY_CACHE_URL = "content/registry_cache.json";

const REGIONAL_TABLES = [
  { key: "np", label: "Земли населенных пунктов" },
  { key: "cxn", label: "Земли сельскохозяйственного назначения" },
  { key: "prom", label: "Земли промышленности и иного специального назначения" },
  { key: "oot", label: "Особо охраняемые территории" },
  { key: "lf", label: "Земли лесного фонда" },
  { key: "vf", label: "Земли водного фонда" },
  { key: "zz", label: "Земли запаса" },
  { key: "buildingMKD", label: "Здания многоквартирных домов" },
  { key: "buildingGD", label: "Здания жилых домов" },
  { key: "buildingSD", label: "Здания садовых домов" },
  { key: "buildingNonResidential", label: "Здания нежилого назначения" },
  { key: "buildingGarage", label: "Здания гаражей" },
  { key: "premisesResidential", label: "Помещения жилого назначения" },
  { key: "premisesNonResidential", label: "Помещения нежилого назначения" },
  { key: "facilities", label: "Сооружения" },
  { key: "ons", label: "Объекты незавершенного строительства" },
  { key: "mm", label: "Машино-места" },
  { key: "enk", label: "Единые недвижимые комплексы" }
];

const GROUPING_REGIONAL_TABLE = {
  residential: "np",
  garden: "np",
  business: "np",
  industry: "prom",
  agriculture: "cxn",
  public: "np",
  recreation: "np",
  transport: "np",
  other: "np"
};

const OBJECT_TYPE_REGIONAL_TABLE = {
  house: "buildingGD",
  flat: "premisesResidential",
  room: "premisesResidential",
  land: "np",
  garage: "buildingGarage",
  other: "premisesNonResidential",
  special: "facilities"
};

const OPTION_SETS = {
  purpose: [
    ["residential", "Жилой объект"],
    ["retailComplex", "Торговый центр"],
    ["retailEntertainment", "Торгово-развлекательный центр"],
    ["retailSmall", "Магазин до 5 000 кв. м"],
    ["office", "Офисный объект"],
    ["food", "Общественное питание"],
    ["household", "Бытовое обслуживание"],
    ["warehouse", "Склад"],
    ["production", "Производственный объект"],
    ["hotel", "Гостиница или временное проживание"],
    ["public", "Общественное использование"],
    ["recreation", "Рекреационный объект"],
    ["parking", "Хранение транспорта"],
    ["utility", "Инженерное сооружение"]
  ],
  stage: [
    ["complete", "Эксплуатация завершенного объекта"],
    ["unfinishedResidential", "Незавершенное строительство жилого дома"],
    ["unfinishedApartment", "Незавершенное строительство многоквартирного дома"],
    ["unfinishedCommercial", "Незавершенное строительство нежилого объекта"]
  ],
  capitalGroup: [
    ["one", "Группа I, повышенная долговечность"],
    ["two", "Группа II, капитальное исполнение"],
    ["three", "Группа III, обычное исполнение"],
    ["four", "Группа IV, облегченные конструкции"],
    ["five", "Группа V, временное или слабокапитальное исполнение"]
  ],
  condition: [
    ["normal", "Нормальное состояние"],
    ["repair", "Требуется ремонт"],
    ["dilapidated", "Ветхое состояние"],
    ["emergency", "Аварийное состояние"]
  ],
  floorPosition: [
    ["whole", "Здание целиком"],
    ["basement", "Подземный или цокольный уровень"],
    ["first", "Первый этаж"],
    ["middle", "Средние этажи"],
    ["upper", "Верхние этажи"],
    ["top", "Последний этаж"]
  ],
  layout: [
    ["standard", "Типовая планировка"],
    ["open", "Свободная планировка"],
    ["corridor", "Коридорная планировка"],
    ["fragmented", "Мелкая нарезка помещений"],
    ["special", "Специализированная планировка"]
  ],
  frontage: [
    ["firstLine", "Первая линия застройки"],
    ["secondLine", "Вторая линия застройки"],
    ["yard", "Внутридворовое расположение"],
    ["none", "Не имеет значения для объекта"]
  ],
  landCategory: [
    ["settlement", "Земли населенных пунктов"],
    ["agriculture", "Земли сельскохозяйственного назначения"],
    ["industry", "Земли промышленности"],
    ["forest", "Земли лесного фонда"],
    ["water", "Земли водного фонда"],
    ["protected", "Особо охраняемые территории"],
    ["reserve", "Земли запаса"]
  ],
  landForm: [
    ["compact", "Компактная форма"],
    ["elongated", "Вытянутая форма"],
    ["irregular", "Сложная конфигурация"]
  ],
  agriLandType: [
    ["none", "Не применяется"],
    ["arable", "Пашня"],
    ["hay", "Сенокос"],
    ["pasture", "Пастбище"],
    ["perennial", "Многолетние насаждения"],
    ["farmBuildings", "Производственные сельхозобъекты"],
    ["roads", "Внутрихозяйственные дороги"],
    ["water", "Замкнутый водоем"]
  ],
  soilQuality: [
    ["notApplied", "Не применяется"],
    ["high", "Высокая агропригодность"],
    ["normal", "Обычное состояние почв"],
    ["low", "Низкая агропригодность"],
    ["poor", "Каменистость, засоление или солонцеватость"]
  ],
  relief: [
    ["normal", "Ровный участок"],
    ["moderate", "Умеренный уклон"],
    ["difficult", "Сложный рельеф"],
    ["wetland", "Заболоченность"]
  ],
  pollution: [
    ["none", "Негативное воздействие не выявлено"],
    ["moderate", "Умеренное загрязнение или шум"],
    ["strong", "Сильное загрязнение или шум"]
  ],
  marketDistance: [
    ["close", "Близко к рынку сбыта"],
    ["medium", "Средняя удаленность"],
    ["far", "Значительная удаленность"]
  ],
  industrialZone: [
    ["none", "Не относится к организованной промышленной зоне"],
    ["inside", "В границах организованной промышленной зоны"],
    ["near", "Рядом с организованной промышленной зоной"]
  ],
  transportAccess: [
    ["federal", "Выход на федеральную трассу"],
    ["regional", "Выход на региональную дорогу"],
    ["local", "Местная дорога"],
    ["unpaved", "Грунтовый подъезд"],
    ["none", "Подъезд затруднен"]
  ],
  socialInfrastructure: [
    ["weak", "Социальная инфраструктура слабая"],
    ["normal", "Обычная обеспеченность"],
    ["strong", "Школы, медицина и торговля в доступности"],
    ["high", "Высокая обеспеченность услугами"]
  ],
  positiveCenter: [
    ["none", "Положительный локальный центр отсутствует"],
    ["near", "Рядом положительный локальный центр"],
    ["strong", "Сильное положительное влияние центра"]
  ],
  negativeCenter: [
    ["none", "Отрицательный локальный центр отсутствует"],
    ["moderate", "Умеренное отрицательное влияние"],
    ["strong", "Сильное отрицательное влияние"]
  ],
  waterRecreation: [
    ["none", "Водоем или рекреация не влияют"],
    ["park", "Рядом парк или благоустроенная территория"],
    ["water", "Рядом водный объект"],
    ["both", "Водоем и рекреационная зона рядом"],
    ["restriction", "Водоохранные ограничения"]
  ],
  railInfluence: [
    ["none", "Железнодорожный фактор отсутствует"],
    ["cargo", "Грузовая инфраструктура полезна"],
    ["noise", "Шумовое влияние железной дороги"]
  ],
  consumerMarket: [
    ["low", "Низкая покупательская активность"],
    ["normal", "Обычная покупательская активность"],
    ["high", "Высокая покупательская активность"],
    ["veryHigh", "Очень высокая покупательская активность"]
  ],
  list378: [
    ["auto", "Определить по признакам объекта"],
    ["yes", "Объект включен в перечень статьи 378.2 НК РФ"],
    ["no", "Объект не включен в перечень статьи 378.2 НК РФ"]
  ]
};

const FIELD_GROUPS = {
  oks: [
    { key: "purpose", label: "Функциональное назначение ОКС", type: "select", options: "purpose", value: "residential" },
    { key: "stage", label: "Стадия объекта", type: "select", options: "stage", value: "complete" },
    { key: "commercialShare", label: "Доля торговых, офисных и сервисных площадей, %", type: "number", min: 0, max: 100, step: 1, value: 0 },
    { key: "capitalGroup", label: "Группа капитальности", type: "select", options: "capitalGroup", value: "two" },
    { key: "condition", label: "Техническое состояние", type: "select", options: "condition", value: "normal" },
    { key: "renovationYear", label: "Год капитального ремонта или реконструкции", type: "number", min: 0, max: RASCHET_YEAR, step: 1, value: 0 },
    { key: "aboveFloors", label: "Количество надземных этажей", type: "number", min: 0, max: 120, step: 1, value: 2 },
    { key: "underFloors", label: "Количество подземных этажей", type: "number", min: 0, max: 20, step: 1, value: 0 },
    { key: "floorPosition", label: "Этаж расположения помещения", type: "select", options: "floorPosition", value: "whole" },
    { key: "layout", label: "Планировочное решение", type: "select", options: "layout", value: "standard" },
    { key: "frontage", label: "Линия застройки", type: "select", options: "frontage", value: "none" }
  ],
  land: [
    { key: "landCategory", label: "Категория земель", type: "select", options: "landCategory", value: "settlement" },
    { key: "landForm", label: "Конфигурация земельного участка", type: "select", options: "landForm", value: "compact" },
    { key: "buildDensity", label: "Плотность застройки земельного участка, %", type: "number", min: 0, max: 300, step: 1, value: 20 },
    { key: "agriLandType", label: "Вид сельскохозяйственных угодий", type: "select", options: "agriLandType", value: "none" },
    { key: "soilQuality", label: "Почвенные и агроэкологические свойства", type: "select", options: "soilQuality", value: "notApplied" },
    { key: "relief", label: "Рельеф и природное состояние", type: "select", options: "relief", value: "normal" },
    { key: "pollution", label: "Экологическое или шумовое воздействие", type: "select", options: "pollution", value: "none" },
    { key: "marketDistance", label: "Удаленность от рынка сбыта", type: "select", options: "marketDistance", value: "medium" },
    { key: "industrialZone", label: "Промышленная зона", type: "select", options: "industrialZone", value: "none" }
  ],
  market: [
    { key: "transportAccess", label: "Транспортная доступность", type: "select", options: "transportAccess", value: "local" },
    { key: "socialInfrastructure", label: "Социальная инфраструктура", type: "select", options: "socialInfrastructure", value: "normal" },
    { key: "positiveCenter", label: "Положительный локальный центр", type: "select", options: "positiveCenter", value: "none" },
    { key: "negativeCenter", label: "Отрицательный локальный центр", type: "select", options: "negativeCenter", value: "none" },
    { key: "waterRecreation", label: "Водоемы и рекреация", type: "select", options: "waterRecreation", value: "none" },
    { key: "railInfluence", label: "Железнодорожная инфраструктура", type: "select", options: "railInfluence", value: "none" },
    { key: "consumerMarket", label: "Покупательская активность территории", type: "select", options: "consumerMarket", value: "normal" }
  ],
  tax: [
    { key: "list378", label: "Перечень статьи 378.2 НК РФ", type: "select", options: "list378", value: "auto" },
    { key: "manualRate", label: "Установленная налоговая ставка, %", type: "number", min: 0, max: 5, step: 0.01, value: 0 }
  ]
};

const elements = {
  objectType: document.getElementById("objectType"),
  grouping: document.getElementById("grouping"),
  location: document.getElementById("location"),
  regionalYear: document.getElementById("regionalYear"),
  regionalTable: document.getElementById("regionalTable"),
  yearBuilt: document.getElementById("yearBuilt"),
  baseUpks: document.getElementById("baseUpks"),
  upksSource: document.getElementById("upksSource"),
  currentCadastralValue: document.getElementById("currentCadastralValue"),
  taxLoadMode: document.getElementById("taxLoadMode"),
  taxpayerType: document.getElementById("taxpayerType"),
  taxRateMode: document.getElementById("taxRateMode"),
  ownershipShare: document.getElementById("ownershipShare"),
  ownershipMonths: document.getElementById("ownershipMonths"),
  taxBenefit: document.getElementById("taxBenefit"),
  childrenCount: document.getElementById("childrenCount"),
  growthLimit: document.getElementById("growthLimit"),
  previousTax: document.getElementById("previousTax"),
  currentArea: document.getElementById("currentArea"),
  currentUse: document.getElementById("currentUse"),
  currentMaterial: document.getElementById("currentMaterial"),
  currentInfrastructure: document.getElementById("currentInfrastructure"),
  currentRestriction: document.getElementById("currentRestriction"),
  forecastArea: document.getElementById("forecastArea"),
  forecastUse: document.getElementById("forecastUse"),
  forecastMaterial: document.getElementById("forecastMaterial"),
  forecastInfrastructure: document.getElementById("forecastInfrastructure"),
  forecastRestriction: document.getElementById("forecastRestriction"),
  forecastLocation: document.getElementById("forecastLocation"),
  forecastYear: document.getElementById("forecastYear"),
  calculate: document.getElementById("calculate"),
  copyCurrent: document.getElementById("copyCurrent"),
  valueDelta: document.getElementById("valueDelta"),
  taxDelta: document.getElementById("taxDelta"),
  thresholdState: document.getElementById("thresholdState"),
  taxReductionPercent: document.getElementById("taxReductionPercent"),
  valueDeltaFixed: document.getElementById("valueDeltaFixed"),
  taxDeltaFixed: document.getElementById("taxDeltaFixed"),
  thresholdStateFixed: document.getElementById("thresholdStateFixed"),
  taxReductionPercentFixed: document.getElementById("taxReductionPercentFixed"),
  resultRows: document.getElementById("resultRows"),
  notice: document.getElementById("notice")
};

const registryState = {
  rowCache: new Map(),
  loadingUpks: false,
  requestId: 0,
  localCachePromise: null,
  lastRowSource: "online"
};

const MATERIAL_FACTORS = {
  brick: { value: 1, wear: 0.45, label: "Кирпич" },
  monolith: { value: 1.04, wear: 0.38, label: "Монолитный железобетон" },
  panel: { value: 0.96, wear: 0.55, label: "Железобетонные панели" },
  blocks: { value: 0.89, wear: 0.6, label: "Легкие бетонные блоки" },
  metal: { value: 0.91, wear: 0.7, label: "Металлический каркас" },
  wood: { value: 0.83, wear: 0.8, label: "Дерево, брус, бревно" },
  mixed: { value: 0.92, wear: 0.65, label: "Смешанные конструкции" }
};

const INFRASTRUCTURE_FACTORS = {
  minimal: { value: 0.9, label: "Нет централизованных сетей" },
  electricity: { value: 0.95, label: "Электроснабжение" },
  water: { value: 1.05, label: "Электроснабжение и водоснабжение" },
  gas: { value: 1.2, label: "Газоснабжение, электроснабжение, водоснабжение" },
  full: { value: 1.3, label: "Полное инженерное обеспечение района" }
};

const RESTRICTION_FACTORS = {
  none: { value: 1, label: "Ограничения не выявлены" },
  moderate: { value: 0.92, label: "Умеренные ограничения использования" },
  strong: { value: 0.8, label: "Существенные ограничения использования" },
  heritage: { value: 0.86, label: "Историко-культурные ограничения" }
};

const USE_FACTORS = {
  residential: { value: 1, label: "Жилая эксплуатация ОКС" },
  individualHousing: { value: 1, label: "ИЖС, ЛПХ, садоводство" },
  agriculture: { value: 0.65, label: "Сельскохозяйственное назначение" },
  business: { value: 1.35, label: "Предпринимательство" },
  industry: { value: 1.15, label: "Производственная деятельность" },
  public: { value: 0.82, label: "Общественное использование" },
  recreation: { value: 0.95, label: "Отдых и рекреация" },
  transport: { value: 0.92, label: "Транспорт" },
  other: { value: 0.9, label: "Иное использование" }
};

const PURPOSE_FACTORS = {
  residential: { value: 1, label: "Жилой объект" },
  retailComplex: { value: 1.35, label: "Торговый центр" },
  retailEntertainment: { value: 1.42, label: "Торгово-развлекательный центр" },
  retailSmall: { value: 1.15, label: "Магазин до 5 000 кв. м" },
  office: { value: 1.3, label: "Офисный объект" },
  food: { value: 1.24, label: "Общественное питание" },
  household: { value: 1.14, label: "Бытовое обслуживание" },
  warehouse: { value: 0.95, label: "Склад" },
  production: { value: 0.9, label: "Производственный объект" },
  hotel: { value: 1.18, label: "Гостиница или временное проживание" },
  public: { value: 0.78, label: "Общественное использование" },
  recreation: { value: 0.95, label: "Рекреационный объект" },
  parking: { value: 0.72, label: "Хранение транспорта" },
  utility: { value: 0.62, label: "Инженерное сооружение" }
};

const STAGE_FACTORS = {
  complete: { value: 1, label: "Эксплуатация завершенного объекта" },
  unfinishedResidential: { value: 0.65, label: "Незавершенное строительство жилого дома" },
  unfinishedApartment: { value: 0.6, label: "Незавершенное строительство многоквартирного дома" },
  unfinishedCommercial: { value: 0.7, label: "Незавершенное строительство нежилого объекта" }
};

const CAPITAL_FACTORS = {
  one: { value: 1.08, label: "Группа I, повышенная долговечность" },
  two: { value: 1, label: "Группа II, капитальное исполнение" },
  three: { value: 0.94, label: "Группа III, обычное исполнение" },
  four: { value: 0.88, label: "Группа IV, облегченные конструкции" },
  five: { value: 0.72, label: "Группа V, временное или слабокапитальное исполнение" }
};

const CONDITION_FACTORS = {
  normal: { value: 1, wear: 0, label: "Нормальное состояние" },
  repair: { value: 0.92, wear: 6, label: "Требуется ремонт" },
  dilapidated: { value: 0.76, wear: 22, label: "Ветхое состояние" },
  emergency: { value: 0.5, wear: 45, label: "Аварийное состояние" }
};

const GROUPING_DEFAULTS = {
  residential: 56000,
  garden: 38000,
  business: 82000,
  industry: 46000,
  agriculture: 600,
  public: 36000,
  recreation: 28000,
  transport: 26000,
  other: 30000
};

const GROUPING_USE = {
  residential: "residential",
  garden: "individualHousing",
  business: "business",
  industry: "industry",
  agriculture: "agriculture",
  public: "public",
  recreation: "recreation",
  transport: "transport",
  other: "other"
};

const GROUPING_PURPOSE = {
  residential: "residential",
  garden: "residential",
  business: "retailComplex",
  industry: "production",
  agriculture: "production",
  public: "public",
  recreation: "recreation",
  transport: "parking",
  other: "utility"
};

const FIELD_HELP = {
  objectType: "Выберите тип объекта по сведениям ЕГРН. Тип объекта влияет на налоговый вычет и на предельную налоговую ставку.",
  grouping: "Группировка объектов определяет базовый УПКС для расчета кадастровой стоимости.",
  location: "Выберите субъект Российской Федерации, в котором расположен объект капитального строительства или земельный участок.",
  regionalYear: "Выберите период региональной таблицы индекса рынка недвижимости из сведений ФД ГКО.",
  regionalTable: "Выберите региональную таблицу, соответствующую виду объекта: земли, здания, помещения, сооружения, ОНС, машино-места, ЕНК.",
  yearBuilt: "Укажите год завершения строительства. Показатель учитывается для расчета физического износа и не изменяется в прогнозе.",
  baseUpks: "УПКС — удельный показатель кадастровой стоимости в рублях за 1 кв. м. Значение заполняется автоматически по выбранному субъекту и региональной таблице.",
  currentCadastralValue: "Укажите текущую кадастровую стоимость по выписке ЕГРН или актуальным сведениям правообладателя. Значение используется для сверки и налогового расчета по выбранному режиму.",
  taxLoadMode: "Выберите порядок налогового сравнения: текущая колонка по указанной кадастровой стоимости или обе колонки по расчетной кадастровой стоимости.",
  taxpayerType: "Выберите тип правообладателя: физическое лицо или организация. От этого зависят вычеты и налоговая ставка.",
  taxRateMode: "Выберите режим налоговой ставки: расчет по правилам НК РФ или установленная ставка вручную.",
  ownershipShare: "Укажите долю в праве собственности в процентах.",
  ownershipMonths: "Укажите количество месяцев владения объектом в налоговом периоде.",
  taxBenefit: "Укажите размер снижения по налоговой льготе в процентах при наличии подтвержденного основания.",
  childrenCount: "Для объектов физических лиц укажите количество детей для дополнительного налогового вычета.",
  growthLimit: "Применяйте ограничение роста налога только при наличии оснований для физического лица.",
  previousTax: "Укажите сумму налога за предыдущий период для расчета ограничения роста налога.",
  area: "Укажите площадь объекта в квадратных метрах по сведениям ЕГРН или технического учета.",
  use: "Выберите вид разрешенного использования. Показатель влияет на УПКС, налоговую ставку и итоговую налоговую базу.",
  material: "Выберите капитальность стен. Материал стен влияет на коэффициент стоимости и расчет физического износа.",
  infrastructure: "Укажите уровень инженерного обеспечения. Наличие сетей влияет на коэффициент УПКС.",
  restriction: "Укажите наличие ЗОУИТ и иных ограничений использования территории или объекта.",
  purpose: "Выберите функциональное назначение ОКС по фактическому и правовому использованию.",
  stage: "Выберите стадию объекта: завершенный объект или незавершенное строительство.",
  commercialShare: "Укажите долю торговых, офисных и сервисных площадей в процентах.",
  capitalGroup: "Выберите группу капитальности для уточнения долговечности конструкций.",
  condition: "Выберите техническое состояние объекта по результатам обследования или данным учета.",
  renovationYear: "Укажите год капитального ремонта или реконструкции. При отсутствии данных оставьте 0.",
  aboveFloors: "Укажите количество надземных этажей.",
  underFloors: "Укажите количество подземных этажей.",
  floorPosition: "Выберите положение помещения по этажу.",
  layout: "Выберите планировочное решение объекта.",
  frontage: "Выберите линию застройки и характер расположения относительно улично-дорожной сети.",
  landCategory: "Выберите категорию земельного участка.",
  landForm: "Выберите конфигурацию земельного участка.",
  buildDensity: "Укажите плотность застройки земельного участка в процентах.",
  agriLandType: "Выберите вид сельскохозяйственных угодий при сельскохозяйственном использовании.",
  soilQuality: "Укажите почвенные и агроэкологические свойства участка.",
  relief: "Выберите рельеф и природное состояние участка.",
  pollution: "Укажите уровень экологического и шумового воздействия.",
  marketDistance: "Выберите удаленность от рынка сбыта или потребления.",
  industrialZone: "Укажите расположение относительно организованной промышленной зоны.",
  transportAccess: "Выберите транспортную доступность объекта или участка.",
  socialInfrastructure: "Оцените обеспеченность социальной инфраструктурой в зоне расположения объекта.",
  positiveCenter: "Укажите влияние положительного локального центра на стоимость.",
  negativeCenter: "Укажите влияние отрицательного локального центра на стоимость.",
  waterRecreation: "Укажите влияние водоемов и рекреационных зон.",
  railInfluence: "Укажите влияние железнодорожной инфраструктуры.",
  consumerMarket: "Оцените покупательскую активность территории.",
  list378: "Укажите признак включения объекта в перечень статьи 378.2 НК РФ.",
  manualRate: "Укажите налоговую ставку в процентах при ручном режиме расчета ставки."
};

function lowerFirst(value) {
  if (!value) return "";
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function helpKeyFromControlId(controlId) {
  if (!controlId) return "";
  if (controlId.startsWith("current_") || controlId.startsWith("forecast_")) {
    return controlId.split("_").slice(1).join("_");
  }
  if (controlId.startsWith("current")) {
    return lowerFirst(controlId.slice("current".length));
  }
  if (controlId.startsWith("forecast")) {
    return lowerFirst(controlId.slice("forecast".length));
  }
  return controlId;
}

function helpTextForControl(control) {
  const key = helpKeyFromControlId(control.id);
  const baseText = FIELD_HELP[key]
    || "Укажите значение по документам ЕГРН, технического учета и действующим сведениям государственной кадастровой оценки.";

  if (control.id.startsWith("forecast") || control.id.startsWith("forecast_")) {
    return `${baseText} Для прогноза укажите значение после изменения характеристики.`;
  }
  return baseText;
}

function selectText(field, fallback = "") {
  if (!field) return fallback;
  const option = field.options[field.selectedIndex];
  if (!option) return fallback;
  return option.textContent.trim() || fallback;
}

function setSelectOptions(field, options, preferredValue = "") {
  if (!field) return;
  field.replaceChildren();
  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    field.append(option);
  });

  if (preferredValue && options.some((option) => option.value === preferredValue)) {
    field.value = preferredValue;
  } else if (!field.value && options.length) {
    field.value = options[0].value;
  }
}

function decodeMojibake(text) {
  if (typeof text !== "string" || !/[\u00D0\u00D1]/.test(text)) return text;

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xFF);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return /[\u0400-\u04FF]/.test(decoded) ? decoded : text;
  } catch (error) {
    return text;
  }
}

function normalizeRegistryPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeRegistryPayload(item));
  }

  if (payload && typeof payload === "object") {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, normalizeRegistryPayload(value)])
    );
  }

  if (typeof payload === "string") {
    return decodeMojibake(payload.trim());
  }

  return payload;
}

async function fetchRegistryPayload(path, init = undefined) {
  const response = await fetch(`${REGISTRY_API_BASE}/${path}`, init);
  if (!response.ok) {
    throw new Error(`Не удалось получить сведения ФД ГКО: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeRegistryPayload(payload);
}

async function fetchLocalRegistryPayload() {
  const response = await fetch(REGISTRY_CACHE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось получить локальный слепок реестра: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeRegistryPayload(payload);
}

async function loadLocalRegistryCache() {
  if (!registryState.localCachePromise) {
    registryState.localCachePromise = fetchLocalRegistryPayload().catch(() => null);
  }
  return registryState.localCachePromise;
}

function defaultRegionalTableByObject() {
  const type = elements.objectType.value;
  if (type === "land") {
    return GROUPING_REGIONAL_TABLE[elements.grouping.value] || "np";
  }
  return OBJECT_TYPE_REGIONAL_TABLE[type] || "buildingNonResidential";
}

function currentGroupingBaseUpks() {
  return GROUPING_DEFAULTS[elements.grouping.value] || GROUPING_DEFAULTS.other;
}

function setUpksSource(text) {
  if (!elements.upksSource) return;
  elements.upksSource.textContent = text;
}

function setRegionalTableDefault() {
  const defaultKey = defaultRegionalTableByObject();
  if (elements.regionalTable && REGIONAL_TABLES.some((table) => table.key === defaultKey)) {
    elements.regionalTable.value = defaultKey;
  }
}

function normalizeSubjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[«»"]/g, "")
    .trim();
}

function rowsFromRegistryPayload(payload) {
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.value)
      ? payload.value
      : Array.isArray(payload?.valueArray)
        ? payload.valueArray
        : [];
}

function listFromPayload(payload, primaryKey, fallbackKey = "value") {
  if (Array.isArray(payload?.[primaryKey])) return payload[primaryKey];
  if (Array.isArray(payload?.[fallbackKey])) return payload[fallbackKey];
  return [];
}

function yearsFromCache(cache) {
  const directYears = listFromPayload(cache, "years");
  if (directYears.length) return directYears;
  const keys = Object.keys(cache?.indexByYear || {});
  return keys.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function rowsByYearFromCache(cache, year) {
  if (!cache?.indexByYear) return [];
  const bucket = cache.indexByYear[String(year)] ?? cache.indexByYear[year];
  return rowsFromRegistryPayload(bucket);
}

async function loadRegionalIndexRow(year, subject) {
  const key = `${year}|${subject}`;
  if (registryState.rowCache.has(key)) {
    const cachedEntry = registryState.rowCache.get(key);
    const source = cachedEntry?.source || "online";
    registryState.lastRowSource = source;
    return cachedEntry?.row ?? cachedEntry;
  }

  const loadRows = async (subjects) => {
    const payload = await fetchRegistryPayload(`public-market-index?year=${encodeURIComponent(year)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(subjects)
    });
    return rowsFromRegistryPayload(payload);
  };

  const normalizedSubject = normalizeSubjectName(subject);
  let rows = [];
  let fromCache = false;
  try {
    rows = await loadRows([subject]);
  } catch (error) {
    rows = [];
  }
  if (!rows.length) {
    try {
      rows = await loadRows([]);
    } catch (error) {
      rows = [];
    }
  }

  if (!rows.length) {
    const cache = await loadLocalRegistryCache();
    rows = rowsByYearFromCache(cache, year);
    fromCache = true;
  }

  const row = rows.find((item) => normalizeSubjectName(item.subject) === normalizedSubject) || rows[0] || null;
  const source = fromCache ? "cache" : "online";
  registryState.rowCache.set(key, { row, source });
  registryState.lastRowSource = source;
  return row;
}

async function applyRegionalUpks() {
  const requestId = ++registryState.requestId;
  const groupingBase = currentGroupingBaseUpks();
  const subject = elements.location.value;
  const year = Number(elements.regionalYear.value);
  const tableKey = elements.regionalTable.value || defaultRegionalTableByObject();

  if (!subject || !Number.isFinite(year) || !tableKey) {
    elements.baseUpks.value = Math.round(groupingBase);
    setUpksSource("Применено базовое значение УПКС по группировке объектов.");
    updateResult();
    return;
  }

  registryState.loadingUpks = true;
  setUpksSource("Загрузка сведений региональной таблицы…");
  try {
    const row = await loadRegionalIndexRow(year, subject);
    if (requestId !== registryState.requestId) return;

    const tableValue = Number(row?.[tableKey]);
    const regionalCoefficient = Number.isFinite(tableValue) && tableValue > 0 ? tableValue : 1;
    const upks = Math.max(0, Math.round(groupingBase * regionalCoefficient));
    elements.baseUpks.value = String(upks);

    const tableLabel = REGIONAL_TABLES.find((table) => table.key === tableKey)?.label || tableKey;
    const sourceLabel = registryState.lastRowSource === "cache"
      ? "Локальный слепок ФД ГКО"
      : "Фонд данных государственной кадастровой оценки НСПД";
    setUpksSource(
      `Источник: ${sourceLabel}. ` +
      `Субъект: ${subject}. Период: ${year}. Региональная таблица: ${tableLabel}. ` +
      `Примененный коэффициент: ${regionalCoefficient.toLocaleString("ru-RU", { maximumFractionDigits: 3 })}.`
    );
  } catch (error) {
    if (requestId !== registryState.requestId) return;

    elements.baseUpks.value = String(Math.round(groupingBase));
    setUpksSource(
      "Сведения региональной таблицы временно недоступны. Применено базовое значение УПКС по группировке объектов."
    );
  } finally {
    if (requestId !== registryState.requestId) return;

    registryState.loadingUpks = false;
    updateResult();
  }
}

async function initializeRegistryData() {
  setSelectOptions(elements.regionalTable, REGIONAL_TABLES.map((table) => ({ value: table.key, label: table.label })), "np");
  setUpksSource("Загрузка сведений ФД ГКО…");

  try {
    const [subjectsPayload, yearsPayload] = await Promise.all([
      fetchRegistryPayload("subject"),
      fetchRegistryPayload("year")
    ]);

    const subjectValues = listFromPayload(subjectsPayload, "valueArray");
    const subjects = subjectValues
      .map((value) => String(value).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ru"));

    const yearValues = listFromPayload(yearsPayload, "valueArray");
    const years = yearValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a);

    if (subjects.length) {
      const preferredSubject = subjects.find((value) => /\u043C\u043E\u0441\u043A\u0432/i.test(value)) || subjects[0];
      setSelectOptions(
        elements.location,
        subjects.map((value) => ({ value, label: value })),
        preferredSubject
      );
    } else {
      setSelectOptions(elements.location, [{ value: "Не указан", label: "Не указан" }], "Не указан");
    }

    if (years.length) {
      setSelectOptions(
        elements.regionalYear,
        years.map((value) => ({ value: String(value), label: String(value) })),
        years.includes(RASCHET_YEAR) ? String(RASCHET_YEAR) : String(years[0])
      );
    } else {
      setSelectOptions(elements.regionalYear, [{ value: String(RASCHET_YEAR), label: String(RASCHET_YEAR) }], String(RASCHET_YEAR));
    }

    setRegionalTableDefault();
    await applyRegionalUpks();
  } catch (error) {
    const cache = await loadLocalRegistryCache();
    const cachedSubjects = listFromPayload(cache, "subjects")
      .map((value) => String(value).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ru"));
    const cachedYears = yearsFromCache(cache)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a);

    if (cachedSubjects.length) {
      const preferredSubject = cachedSubjects.find((value) => /\u043C\u043E\u0441\u043A\u0432/i.test(value)) || cachedSubjects[0];
      setSelectOptions(
        elements.location,
        cachedSubjects.map((value) => ({ value, label: value })),
        preferredSubject
      );
    } else {
      setSelectOptions(elements.location, [{ value: "Не указан", label: "Не указан" }], "Не указан");
    }

    if (cachedYears.length) {
      setSelectOptions(
        elements.regionalYear,
        cachedYears.map((value) => ({ value: String(value), label: String(value) })),
        cachedYears.includes(RASCHET_YEAR) ? String(RASCHET_YEAR) : String(cachedYears[0])
      );
    } else {
      setSelectOptions(elements.regionalYear, [{ value: String(RASCHET_YEAR), label: String(RASCHET_YEAR) }], String(RASCHET_YEAR));
    }

    setRegionalTableDefault();
    if (cachedSubjects.length && cachedYears.length) {
      const generatedAt = cache?.generatedAt ? ` от ${cache.generatedAt}` : "";
      setUpksSource(
        `Онлайн-доступ к ФД ГКО временно недоступен. Используется локальный слепок реестра${generatedAt}.`
      );
      await applyRegionalUpks();
      return;
    }

    elements.baseUpks.value = String(Math.round(currentGroupingBaseUpks()));
    setUpksSource("Сведения ФД ГКО недоступны. Применено базовое значение УПКС по группировке объектов.");
    updateResult();
  }
}

function fieldId(prefix, key) {
  return `${prefix}_${key}`;
}

function allFieldDefinitions() {
  return Object.values(FIELD_GROUPS).flat();
}

function createField(prefix, definition) {
  const label = document.createElement("label");
  const span = document.createElement("span");
  const control = document.createElement(definition.type === "select" ? "select" : "input");

  span.textContent = definition.label;
  control.id = fieldId(prefix, definition.key);

  if (definition.type === "select") {
    OPTION_SETS[definition.options].forEach(([value, optionLabel]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = optionLabel;
      control.append(option);
    });
    control.value = definition.value;
  } else {
    control.type = "number";
    control.min = definition.min;
    control.max = definition.max;
    control.step = definition.step;
    control.value = definition.value;
  }

  label.append(span, control);
  return label;
}

function createScenarioFields(prefix) {
  Object.entries(FIELD_GROUPS).forEach(([groupName, definitions]) => {
    const container = document.getElementById(`${prefix}${groupName[0].toUpperCase()}${groupName.slice(1)}Fields`);
    definitions.forEach((definition) => container.append(createField(prefix, definition)));
  });
}

createScenarioFields("current");
createScenarioFields("forecast");

const changeControllers = [];

function fieldCaption(control, fallback = "Показатель") {
  const label = control.closest("label");
  const caption = label ? label.querySelector("span") : null;
  return caption ? caption.textContent.trim() : fallback;
}

function buildChangeLinks() {
  const links = [
    { currentId: "currentArea", forecastId: "forecastArea", caption: "Площадь после изменения, кв. м" },
    { currentId: "currentUse", forecastId: "forecastUse", caption: "Вид разрешенного использования после изменения" },
    { currentId: "currentMaterial", forecastId: "forecastMaterial", caption: "Капитальность стен после изменения" },
    { currentId: "currentInfrastructure", forecastId: "forecastInfrastructure", caption: "Инженерное обеспечение после изменения" },
    { currentId: "currentRestriction", forecastId: "forecastRestriction", caption: "ЗОУИТ и иные ограничения после изменения" }
  ];

  allFieldDefinitions().forEach((definition) => {
    links.push({
      currentId: fieldId("current", definition.key),
      forecastId: fieldId("forecast", definition.key),
      caption: `${definition.label} после изменения`
    });
  });

  return links;
}

function applyChangeControllerState(controller) {
  const unavailable = controller.current.disabled;
  if (unavailable) {
    controller.toggle.checked = false;
  }

  controller.toggle.disabled = unavailable;
  const active = controller.toggle.checked && !unavailable;
  controller.drawer.hidden = !active;
  controller.forecast.disabled = !active;

  if (!active) {
    controller.forecast.value = controller.current.value;
  }
}

function setupChangeControllers() {
  buildChangeLinks().forEach((link) => {
    const current = document.getElementById(link.currentId);
    const forecast = document.getElementById(link.forecastId);
    if (!current || !forecast) return;

    const currentLabel = current.closest("label");
    if (!currentLabel) return;

    forecast.value = current.value;

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "change-toggle";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    const toggleText = document.createElement("span");
    toggleText.textContent = "Изменить";
    toggleLabel.append(toggle, toggleText);

    const drawer = document.createElement("div");
    drawer.className = "change-drawer";
    drawer.hidden = true;

    const drawerLabel = document.createElement("label");
    const drawerCaption = document.createElement("span");
    drawerCaption.textContent = link.caption || `${fieldCaption(current)} после изменения`;
    drawerLabel.append(drawerCaption, forecast);
    drawer.append(drawerLabel);

    const captionNode = currentLabel.querySelector("span");
    if (captionNode) {
      captionNode.classList.add("field-caption");
      captionNode.append(toggleLabel);
    } else {
      currentLabel.prepend(toggleLabel);
    }
    currentLabel.insertAdjacentElement("afterend", drawer);

    const controller = { current, forecast, toggle, drawer };
    changeControllers.push(controller);

    const syncFromCurrent = () => {
      if (!toggle.checked) {
        forecast.value = current.value;
      }
      applyChangeControllerState(controller);
    };

    toggle.addEventListener("change", () => {
      applyChangeControllerState(controller);
      updateResult();
    });

    current.addEventListener("input", syncFromCurrent);
    current.addEventListener("change", syncFromCurrent);

    applyChangeControllerState(controller);
  });
}

setupChangeControllers();

function installFieldHelp() {
  const labels = document.querySelectorAll("label");

  labels.forEach((label) => {
    if (label.classList.contains("change-toggle")) return;
    if (label.dataset.helpReady === "yes") return;

    const control = label.querySelector("input, select");
    if (!control || !control.id) return;
    if (control.type === "checkbox") return;

    const caption = label.querySelector("span");
    if (!caption) return;

    const helpButton = document.createElement("button");
    helpButton.type = "button";
    helpButton.className = "help-toggle";
    helpButton.textContent = "?";
    helpButton.setAttribute("aria-label", "Пояснение по заполнению");
    helpButton.setAttribute("aria-expanded", "false");

    const helpPanel = document.createElement("div");
    helpPanel.className = "field-help";
    helpPanel.hidden = true;
    helpPanel.textContent = helpTextForControl(control);
    helpPanel.id = `help_${control.id}`;

    helpButton.setAttribute("aria-controls", helpPanel.id);
    helpButton.addEventListener("click", () => {
      const shouldOpen = helpButton.getAttribute("aria-expanded") !== "true";

      document.querySelectorAll(".help-toggle[aria-expanded='true']").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
      });
      document.querySelectorAll(".field-help").forEach((panel) => {
        panel.hidden = true;
      });

      helpButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      helpPanel.hidden = !shouldOpen;
    });

    caption.classList.add("field-caption");
    const changeToggle = caption.querySelector(".change-toggle");
    if (changeToggle) {
      caption.insertBefore(helpButton, changeToggle);
    } else {
      caption.append(helpButton);
    }

    label.append(helpPanel);
    label.dataset.helpReady = "yes";
  });
}

installFieldHelp();

function installFactorSectionToggles() {
  document.querySelectorAll(".factor-section").forEach((section, index) => {
    if (section.dataset.toggleReady === "yes") return;
    const heading = section.querySelector("h3");
    if (!heading) return;

    const head = document.createElement("div");
    head.className = "factor-section__head";
    heading.replaceWith(head);
    head.append(heading);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "factor-toggle";
    head.append(toggle);

    const collapsedDefault = index > 0;
    section.dataset.collapsed = collapsedDefault ? "yes" : "no";
    toggle.textContent = collapsedDefault ? "Развернуть" : "Свернуть";

    toggle.addEventListener("click", () => {
      const collapsed = section.dataset.collapsed === "yes";
      section.dataset.collapsed = collapsed ? "no" : "yes";
      toggle.textContent = collapsed ? "Свернуть" : "Развернуть";
    });

    section.dataset.toggleReady = "yes";
  });
}

installFactorSectionToggles();

function numberValue(field, fallback = 0) {
  if (!field) return fallback;
  const value = Number(String(field.value).replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

function scenarioValue(prefix, key, fallback = "") {
  const field = document.getElementById(fieldId(prefix, key));
  if (!field) return fallback;
  return field.value;
}

function setScenarioValue(prefix, key, value) {
  const field = document.getElementById(fieldId(prefix, key));
  if (field) field.value = value;
}

function scenarioNumber(prefix, key, fallback = 0) {
  return numberValue(document.getElementById(fieldId(prefix, key)), fallback);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rubles(value) {
  return `${Math.round(value).toLocaleString("ru-RU")} руб.`;
}

function percent(value) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %`;
}

function coefficient(value) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function optionLabel(optionSet, value) {
  const match = OPTION_SETS[optionSet].find(([optionValue]) => optionValue === value);
  return match ? match[1] : value;
}

function isLand(type) {
  return type === "land";
}

function isCommercialPurpose(purpose) {
  return ["retailComplex", "retailEntertainment", "retailSmall", "office", "food", "household", "hotel"].includes(purpose);
}

function isResidentialObject(type, purpose, stage) {
  return ["house", "flat", "room"].includes(type) || purpose === "residential" || stage === "unfinishedResidential";
}

function deductionArea(type, taxpayerType, childrenCount) {
  if (taxpayerType !== "person") return 0;

  let area = 0;
  if (type === "room") area = 10;
  if (type === "flat") area = 20;
  if (type === "house") area = 50;

  if (childrenCount >= 3) {
    if (type === "room" || type === "flat") area += childrenCount * 5;
    if (type === "house") area += childrenCount * 7;
  }

  return area;
}

function materialFactor(type, material) {
  if (isLand(type)) {
    return { value: 1, wear: 0, label: "Не применяется для земельного участка" };
  }
  return MATERIAL_FACTORS[material] || MATERIAL_FACTORS.brick;
}

function effectiveAge(yearBuilt, renovationYear) {
  const fullAge = clamp(RASCHET_YEAR - yearBuilt, 0, 226);
  if (renovationYear <= yearBuilt || renovationYear > RASCHET_YEAR) return fullAge;

  const ageBeforeRenovation = renovationYear - yearBuilt;
  const ageAfterRenovation = RASCHET_YEAR - renovationYear;
  return clamp(ageAfterRenovation * 0.7 + ageBeforeRenovation * 0.35, 0, fullAge);
}

function physicalWear(type, yearBuilt, material, renovationYear, condition) {
  if (isLand(type)) {
    return { wearPercent: 0, wearFactor: 1, age: 0 };
  }

  const age = effectiveAge(yearBuilt, renovationYear);
  const materialData = materialFactor(type, material);
  const conditionData = CONDITION_FACTORS[condition] || CONDITION_FACTORS.normal;
  const wearPercent = clamp(age * materialData.wear + conditionData.wear, 0, 85);
  const wearFactor = clamp(1 - wearPercent / 100, 0.35, 1);
  return { wearPercent, wearFactor, age };
}

function areaScale(type, area) {
  if (type === "flat" || type === "room") {
    if (area < 65) return 1.03;
    if (area <= 100) return 1;
    return 0.96;
  }

  if (type === "house") {
    if (area < 100) return 1.02;
    if (area <= 200) return 1;
    return 0.95;
  }

  if (type === "land") {
    if (area <= 1500) return 1.02;
    if (area <= 3000) return 1;
    if (area <= 10000) return 0.96;
    return 0.9;
  }

  if (area <= 3000) return 1.01;
  if (area <= 6000) return 1;
  if (area <= 10000) return 0.97;
  return 0.93;
}

function commercialShareFactor(type, purpose, commercialShare) {
  if (isLand(type)) return 1;
  if (!isCommercialPurpose(purpose) && commercialShare === 0) return 1;
  return clamp(0.96 + commercialShare * 0.0016, 0.95, 1.12);
}

function floorPositionFactor(type, purpose, floorPosition) {
  if (isLand(type)) return 1;
  if (floorPosition === "basement") return 0.75;
  if (floorPosition === "first") return isCommercialPurpose(purpose) ? 1.08 : 0.98;
  if (floorPosition === "middle") return 1;
  if (floorPosition === "upper") return 0.97;
  if (floorPosition === "top") return 0.94;
  return 1;
}

function floorCountFactor(type, purpose, aboveFloors, underFloors) {
  if (isLand(type)) return 1;
  const above = clamp(aboveFloors, 0, 120);
  const under = clamp(underFloors, 0, 20);
  let factor = 1;

  if (above >= 3 && isCommercialPurpose(purpose)) factor += Math.min(above, 30) * 0.002;
  if (above === 1 && purpose === "warehouse") factor += 0.03;
  if (under > 0 && isCommercialPurpose(purpose)) factor += Math.min(under, 4) * 0.015;

  return clamp(factor, 0.95, 1.12);
}

function layoutFactor(type, layout) {
  if (isLand(type)) return 1;
  const values = { standard: 1, open: 1.05, corridor: 0.98, fragmented: 0.93, special: 0.96 };
  return values[layout] || 1;
}

function frontageFactor(type, purpose, frontage) {
  if (isLand(type) || !isCommercialPurpose(purpose)) return 1;
  const values = { firstLine: 1.08, secondLine: 1, yard: 0.92, none: 1 };
  return values[frontage] || 1;
}

function landCategoryFactor(category) {
  const values = {
    settlement: 1,
    agriculture: 0.72,
    industry: 1.08,
    forest: 0.45,
    water: 0.42,
    protected: 0.58,
    reserve: 0.5
  };
  return values[category] || 1;
}

function landFormFactor(form) {
  const values = { compact: 1, elongated: 0.93, irregular: 0.9 };
  return values[form] || 1;
}

function buildDensityFactor(use, density) {
  const value = clamp(density, 0, 300);
  if (use === "business" || use === "industry") {
    if (value === 0) return 0.92;
    if (value <= 25) return 1;
    if (value <= 80) return 1.08;
    return 1.04;
  }
  if (use === "individualHousing" || use === "residential") {
    if (value <= 10) return 0.96;
    if (value <= 45) return 1.02;
    return 0.98;
  }
  return 1;
}

function agriLandTypeFactor(use, type) {
  if (use !== "agriculture" && elements.grouping.value !== "agriculture") return 1;
  const values = {
    none: 1,
    arable: 1,
    hay: 0.74,
    pasture: 0.66,
    perennial: 1.12,
    farmBuildings: 0.95,
    roads: 0.52,
    water: 0.42
  };
  return values[type] || 1;
}

function soilFactor(use, soilQuality) {
  if (use !== "agriculture" && elements.grouping.value !== "agriculture") return 1;
  const values = { notApplied: 1, high: 1.15, normal: 1, low: 0.85, poor: 0.65 };
  return values[soilQuality] || 1;
}

function reliefFactor(relief) {
  const values = { normal: 1, moderate: 0.93, difficult: 0.82, wetland: 0.72 };
  return values[relief] || 1;
}

function pollutionFactor(pollution) {
  const values = { none: 1, moderate: 0.86, strong: 0.66 };
  return values[pollution] || 1;
}

function marketDistanceFactor(use, marketDistance) {
  if (use !== "agriculture" && elements.grouping.value !== "agriculture") return 1;
  const values = { close: 1.08, medium: 1, far: 0.9 };
  return values[marketDistance] || 1;
}

function industrialZoneFactor(type, use, industrialZone) {
  if (industrialZone === "none") return 1;
  if (use === "industry" || use === "business") return industrialZone === "inside" ? 1.12 : 1.06;
  if (!isLand(type) && scenarioIsCommercial(use)) return 1.03;
  return 0.92;
}

function scenarioIsCommercial(use) {
  return use === "business" || use === "industry";
}

function transportAccessFactor(access) {
  const values = { federal: 1.08, regional: 1.05, local: 1, unpaved: 0.92, none: 0.82 };
  return values[access] || 1;
}

function socialInfrastructureFactor(type, purpose, level) {
  const values = { weak: 0.94, normal: 1, strong: 1.05, high: 1.08 };
  let factor = values[level] || 1;
  if (purpose === "production" || purpose === "warehouse") factor = 1 + (factor - 1) * 0.35;
  if (isLand(type)) factor = 1 + (factor - 1) * 0.5;
  return factor;
}

function positiveCenterFactor(level) {
  const values = { none: 1, near: 1.06, strong: 1.12 };
  return values[level] || 1;
}

function negativeCenterFactor(level) {
  const values = { none: 1, moderate: 0.94, strong: 0.84 };
  return values[level] || 1;
}

function waterRecreationFactor(type, purpose, value) {
  if (value === "park") return purpose === "production" ? 1.01 : 1.05;
  if (value === "water") return purpose === "production" ? 0.98 : 1.06;
  if (value === "both") return purpose === "production" ? 1 : 1.09;
  if (value === "restriction") return 0.94;
  return 1;
}

function railInfluenceFactor(use, purpose, value) {
  if (value === "cargo") {
    return use === "industry" || purpose === "warehouse" || purpose === "production" ? 1.06 : 0.98;
  }
  if (value === "noise") return 0.92;
  return 1;
}

function consumerMarketFactor(purpose, value) {
  if (!isCommercialPurpose(purpose)) return 1;
  const values = { low: 0.94, normal: 1, high: 1.06, veryHigh: 1.14 };
  return values[value] || 1;
}

function addFactor(factors, label, value) {
  const numeric = Number.isFinite(value) ? value : 1;
  factors.push({ label, value: numeric });
}

function collectScenario(prefix) {
  const scenario = {
    prefix,
    area: Math.max(0, numberValue(elements[`${prefix}Area`])),
    use: elements[`${prefix}Use`].value,
    material: elements[`${prefix}Material`].value,
    infrastructure: elements[`${prefix}Infrastructure`].value,
    restriction: elements[`${prefix}Restriction`].value
  };

  allFieldDefinitions().forEach((definition) => {
    scenario[definition.key] = definition.type === "number"
      ? scenarioNumber(prefix, definition.key, definition.value)
      : scenarioValue(prefix, definition.key, definition.value);
  });

  return scenario;
}

function isArticle378Object(type, scenario) {
  if (isLand(type)) return false;
  if (scenario.list378 === "yes") return true;
  if (scenario.list378 === "no") return false;
  if (type === "special") return true;
  if (scenario.commercialShare >= 20 && isCommercialPurpose(scenario.purpose)) return true;
  return ["retailComplex", "retailEntertainment", "office"].includes(scenario.purpose);
}

function federalTaxRate(type, taxpayerType, scenario, cadastralValue, article378) {
  if (isLand(type)) {
    if (cadastralValue > THRESHOLD) {
      return { rate: 1.5, reason: "Земельный участок дороже 300 млн руб." };
    }
    if (scenario.use === "individualHousing" || scenario.use === "agriculture" || scenario.landCategory === "agriculture") {
      return { rate: 0.3, reason: "Земельный участок льготной категории или ВРИ" };
    }
    return { rate: 1.5, reason: "Земельный участок для прочего использования" };
  }

  if (taxpayerType === "person") {
    if (cadastralValue > THRESHOLD && scenario.stage !== "unfinishedApartment") {
      return { rate: 2.5, reason: "ОКС дороже 300 млн руб." };
    }
    if (article378) return { rate: 2, reason: "Перечень статьи 378.2 НК РФ" };
    if (isResidentialObject(type, scenario.purpose, scenario.stage) || type === "garage") {
      return { rate: 0.1, reason: "Жилой объект, гараж или машино-место" };
    }
    return { rate: 0.5, reason: "Прочий объект физического лица" };
  }

  if (cadastralValue > THRESHOLD) {
    return { rate: 2.5, reason: "Объект организации дороже 300 млн руб." };
  }
  if (article378 || type === "special") {
    return { rate: 2, reason: "Кадастровая база по статье 378.2 НК РФ" };
  }
  return { rate: 2, reason: "Кадастровая база для организации" };
}

function calculateTaxFromCadastralValue(scenario, adjustedUpks, cadastralValue, article378) {
  const type = elements.objectType.value;
  const taxpayerType = elements.taxpayerType.value;
  const childrenCount = Math.max(0, Math.round(numberValue(elements.childrenCount)));
  const share = clamp(numberValue(elements.ownershipShare, 100), 1, 100) / 100;
  const months = clamp(numberValue(elements.ownershipMonths, 12), 1, 12) / 12;
  const taxBenefit = clamp(numberValue(elements.taxBenefit, 0), 0, 100) / 100;
  const previousTax = Math.max(0, numberValue(elements.previousTax));

  const safeCadastralValue = Math.max(0, cadastralValue);
  const cadastralPerSquare = scenario.area > 0 ? safeCadastralValue / scenario.area : adjustedUpks;
  const deductArea = Math.min(scenario.area, deductionArea(type, taxpayerType, childrenCount));
  const deductValue = cadastralPerSquare * deductArea;
  const taxableBase = Math.max(0, safeCadastralValue - deductValue);
  const taxRateData = elements.taxRateMode.value === "manual"
    ? { rate: clamp(scenario.manualRate, 0, 5), reason: "Установленная налоговая ставка указана вручную" }
    : federalTaxRate(type, taxpayerType, scenario, safeCadastralValue, article378);
  const rawTax = taxableBase * (taxRateData.rate / 100) * share * months;
  const benefitValue = rawTax * taxBenefit;
  let annualTax = rawTax - benefitValue;
  let growthLimitApplied = false;

  if (
    elements.growthLimit.value === "yes"
    && taxpayerType === "person"
    && previousTax > 0
    && !article378
    && annualTax > previousTax * 1.1
  ) {
    annualTax = previousTax * 1.1;
    growthLimitApplied = true;
  }

  return {
    cadastralValueForTax: safeCadastralValue,
    deductArea,
    deductValue,
    taxableBase,
    rate: taxRateData.rate,
    rateReason: taxRateData.reason,
    rawTax,
    benefitValue,
    annualTax,
    growthLimitApplied
  };
}

function calculateScenario(scenario) {
  const type = elements.objectType.value;
  const baseUpks = Math.max(0, numberValue(elements.baseUpks));
  const yearBuilt = clamp(numberValue(elements.yearBuilt, RASCHET_YEAR), 1800, RASCHET_YEAR);

  const materialData = materialFactor(type, scenario.material);
  const infrastructureData = INFRASTRUCTURE_FACTORS[scenario.infrastructure] || INFRASTRUCTURE_FACTORS.water;
  const restrictionData = RESTRICTION_FACTORS[scenario.restriction] || RESTRICTION_FACTORS.none;
  const useData = USE_FACTORS[scenario.use] || USE_FACTORS.residential;
  const purposeData = PURPOSE_FACTORS[scenario.purpose] || PURPOSE_FACTORS.residential;
  const stageData = STAGE_FACTORS[scenario.stage] || STAGE_FACTORS.complete;
  const capitalData = CAPITAL_FACTORS[scenario.capitalGroup] || CAPITAL_FACTORS.two;
  const conditionData = CONDITION_FACTORS[scenario.condition] || CONDITION_FACTORS.normal;
  const baseUse = GROUPING_USE[elements.grouping.value] || "other";
  const basePurpose = GROUPING_PURPOSE[elements.grouping.value] || "utility";
  const useModifier = useData.value / (USE_FACTORS[baseUse] || USE_FACTORS.other).value;
  const purposeModifier = isLand(type) ? 1 : purposeData.value / (PURPOSE_FACTORS[basePurpose] || PURPOSE_FACTORS.utility).value;
  const scale = areaScale(type, scenario.area);
  const wear = physicalWear(type, yearBuilt, scenario.material, scenario.renovationYear, scenario.condition);
  const factors = [];

  addFactor(factors, "Коэффициент ВРИ к группировке объектов", useModifier);
  addFactor(factors, "Коэффициент масштаба площади", scale);
  addFactor(factors, "Коэффициент инженерного обеспечения", infrastructureData.value);
  addFactor(factors, "Коэффициент ЗОУИТ и ограничений", restrictionData.value);

  if (isLand(type)) {
    addFactor(factors, "Коэффициент категории земель", landCategoryFactor(scenario.landCategory));
    addFactor(factors, "Коэффициент конфигурации участка", landFormFactor(scenario.landForm));
    addFactor(factors, "Коэффициент плотности застройки", buildDensityFactor(scenario.use, scenario.buildDensity));
    addFactor(factors, "Коэффициент вида сельхозугодий", agriLandTypeFactor(scenario.use, scenario.agriLandType));
    addFactor(factors, "Коэффициент почвенных свойств", soilFactor(scenario.use, scenario.soilQuality));
    addFactor(factors, "Коэффициент рельефа", reliefFactor(scenario.relief));
    addFactor(factors, "Коэффициент экологического воздействия", pollutionFactor(scenario.pollution));
    addFactor(factors, "Коэффициент удаленности от рынка сбыта", marketDistanceFactor(scenario.use, scenario.marketDistance));
    addFactor(factors, "Коэффициент промышленной зоны", industrialZoneFactor(type, scenario.use, scenario.industrialZone));
  } else {
    addFactor(factors, "Коэффициент функционального назначения ОКС", purposeModifier);
    addFactor(factors, "Коэффициент стадии объекта", stageData.value);
    addFactor(factors, "Коэффициент доли торговых, офисных и сервисных площадей", commercialShareFactor(type, scenario.purpose, scenario.commercialShare));
    addFactor(factors, "Коэффициент материала стен", materialData.value);
    addFactor(factors, "Коэффициент группы капитальности", capitalData.value);
    addFactor(factors, "Коэффициент технического состояния", conditionData.value);
    addFactor(factors, "Коэффициент физического износа", wear.wearFactor);
    addFactor(factors, "Коэффициент этажности", floorCountFactor(type, scenario.purpose, scenario.aboveFloors, scenario.underFloors));
    addFactor(factors, "Коэффициент этажа расположения", floorPositionFactor(type, scenario.purpose, scenario.floorPosition));
    addFactor(factors, "Коэффициент планировочного решения", layoutFactor(type, scenario.layout));
    addFactor(factors, "Коэффициент линии застройки", frontageFactor(type, scenario.purpose, scenario.frontage));
  }

  addFactor(factors, "Коэффициент транспортной доступности", transportAccessFactor(scenario.transportAccess));
  addFactor(factors, "Коэффициент социальной инфраструктуры", socialInfrastructureFactor(type, scenario.purpose, scenario.socialInfrastructure));
  addFactor(factors, "Коэффициент положительного локального центра", positiveCenterFactor(scenario.positiveCenter));
  addFactor(factors, "Коэффициент отрицательного локального центра", negativeCenterFactor(scenario.negativeCenter));
  addFactor(factors, "Коэффициент водоемов и рекреации", waterRecreationFactor(type, scenario.purpose, scenario.waterRecreation));
  addFactor(factors, "Коэффициент железнодорожной инфраструктуры", railInfluenceFactor(scenario.use, scenario.purpose, scenario.railInfluence));
  addFactor(factors, "Коэффициент покупательской активности", consumerMarketFactor(scenario.purpose, scenario.consumerMarket));

  const totalFactor = factors.reduce((result, item) => result * item.value, 1);
  const adjustedUpks = baseUpks * totalFactor;
  const cadastralValue = adjustedUpks * scenario.area;
  const article378 = isArticle378Object(type, scenario);
  const taxData = calculateTaxFromCadastralValue(scenario, adjustedUpks, cadastralValue, article378);

  return {
    adjustedUpks,
    cadastralValue,
    ...taxData,
    totalFactor,
    factors,
    article378,
    growthLimitApplied,
    materialLabel: materialData.label,
    infrastructureLabel: infrastructureData.label,
    restrictionLabel: restrictionData.label,
    useLabel: useData.label,
    purposeLabel: purposeData.label,
    stageLabel: stageData.label,
    capitalLabel: capitalData.label,
    conditionLabel: conditionData.label,
    wearPercent: wear.wearPercent,
    effectiveAge: wear.age
  };
}

function makeRow(label, current, forecast) {
  const row = document.createElement("tr");
  const nameCell = document.createElement("td");
  const currentCell = document.createElement("td");
  const forecastCell = document.createElement("td");

  nameCell.textContent = label;
  currentCell.textContent = current;
  forecastCell.textContent = forecast;

  row.append(nameCell, currentCell, forecastCell);
  return row;
}

function factorText(result, label) {
  const item = result.factors.find((factor) => factor.label === label);
  return item ? coefficient(item.value) : "1,00";
}

function setSummaryClass(element, delta, goodWhenIncrease = false) {
  const item = element.closest(".summary-item, .results-footer__item");
  if (!item) return;
  const bad = goodWhenIncrease ? delta < 0 : delta > 0;
  const good = goodWhenIncrease ? delta > 0 : delta < 0;

  item.classList.toggle("is-positive", bad);
  item.classList.toggle("is-negative", good);
}

function percentDelta(value) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %`;
}

function setFixedResultValues(valueDeltaText, taxDeltaText, reductionText, thresholdText) {
  if (elements.valueDeltaFixed) elements.valueDeltaFixed.textContent = valueDeltaText;
  if (elements.taxDeltaFixed) elements.taxDeltaFixed.textContent = taxDeltaText;
  if (elements.taxReductionPercentFixed) elements.taxReductionPercentFixed.textContent = reductionText;
  if (elements.thresholdStateFixed) elements.thresholdStateFixed.textContent = thresholdText;
}

function syncFixedResultClasses() {
  if (elements.valueDelta && elements.valueDeltaFixed) {
    setSummaryClass(elements.valueDeltaFixed, Number(String(elements.valueDelta.textContent).replace(/[^\d\-.,]/g, "").replace(",", ".")) || 0);
  }
  if (elements.taxDelta && elements.taxDeltaFixed) {
    setSummaryClass(elements.taxDeltaFixed, Number(String(elements.taxDelta.textContent).replace(/[^\d\-.,]/g, "").replace(",", ".")) || 0);
  }
  if (elements.taxReductionPercent && elements.taxReductionPercentFixed) {
    const reductionValue = Number(String(elements.taxReductionPercent.textContent).replace(/[^\d\-.,]/g, "").replace(",", ".")) || 0;
    setSummaryClass(elements.taxReductionPercentFixed, reductionValue, true);
  }

  const thresholdBox = elements.thresholdStateFixed?.closest(".results-footer__item");
  if (thresholdBox) {
    const stateText = elements.thresholdStateFixed.textContent || "";
    thresholdBox.classList.toggle("is-positive", stateText.includes("Превышен") || stateText.includes("Пересечен"));
    thresholdBox.classList.toggle("is-negative", stateText.includes("Не пересечен"));
  }
}

function noticeParagraph(text, tone = "") {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  if (tone) paragraph.className = tone;
  return paragraph;
}

function updateLockedFields() {
  elements.forecastLocation.textContent = selectText(elements.location, "Локация не указана");
  elements.forecastYear.textContent = String(clamp(numberValue(elements.yearBuilt, RASCHET_YEAR), 1800, RASCHET_YEAR));
}

function updateVisibleSections() {
  const land = isLand(elements.objectType.value);
  document.querySelectorAll(".oks-section").forEach((section) => {
    section.hidden = land;
  });
  document.querySelectorAll(".land-section").forEach((section) => {
    section.hidden = !land;
  });
  [elements.currentMaterial, elements.forecastMaterial].forEach((field) => {
    field.disabled = land;
  });

  changeControllers.forEach((controller) => {
    applyChangeControllerState(controller);
  });

  const visibleFactorSections = Array.from(document.querySelectorAll(".scenario:not(.scenario--forecast) .factor-section"))
    .filter((section) => !section.hidden);
  if (visibleFactorSections.length && visibleFactorSections.every((section) => section.dataset.collapsed === "yes")) {
    visibleFactorSections[0].dataset.collapsed = "no";
    const toggle = visibleFactorSections[0].querySelector(".factor-toggle");
    if (toggle) toggle.textContent = "Свернуть";
  }
}

function updateResult() {
  updateLockedFields();
  updateVisibleSections();

  const currentScenario = collectScenario("current");
  const forecastScenario = collectScenario("forecast");
  const current = calculateScenario(currentScenario);
  const forecast = calculateScenario(forecastScenario);
  const taxLoadMode = elements.taxLoadMode?.value || "declaredCurrent";
  const declaredCadastralValue = Math.max(0, numberValue(elements.currentCadastralValue, 0));
  const useDeclaredTaxMode = taxLoadMode === "declaredCurrent" && declaredCadastralValue > 0;
  const currentByDeclared = useDeclaredTaxMode
    ? {
      ...current,
      ...calculateTaxFromCadastralValue(currentScenario, current.adjustedUpks, declaredCadastralValue, current.article378)
    }
    : null;
  const currentTax = currentByDeclared || current;
  const currentCadastralForTax = currentTax.cadastralValueForTax || current.cadastralValue;
  const annualTaxLabel = useDeclaredTaxMode
    ? "Налоговая нагрузка за год по указанной текущей кадастровой стоимости"
    : "Налоговая нагрузка за год";
  const valueDelta = forecast.cadastralValue - current.cadastralValue;
  const taxDelta = forecast.annualTax - currentTax.annualTax;
  const taxReductionPercent = currentTax.annualTax > 0
    ? ((currentTax.annualTax - forecast.annualTax) / currentTax.annualTax) * 100
    : 0;
  const crossedThreshold = currentCadastralForTax <= THRESHOLD && forecast.cadastralValue > THRESHOLD;
  const overThreshold = currentCadastralForTax > THRESHOLD || forecast.cadastralValue > THRESHOLD;

  const valueDeltaText = `${valueDelta >= 0 ? "+" : ""}${rubles(valueDelta)}`;
  const taxDeltaText = `${taxDelta >= 0 ? "+" : ""}${rubles(taxDelta)}`;
  const reductionText = percentDelta(taxReductionPercent);
  const thresholdText = crossedThreshold
    ? "Пересечен в прогнозе"
    : overThreshold
      ? "Превышен"
      : "Не пересечен";
  elements.valueDelta.textContent = valueDeltaText;
  elements.taxDelta.textContent = taxDeltaText;
  elements.taxReductionPercent.textContent = reductionText;
  elements.thresholdState.textContent = thresholdText;
  setFixedResultValues(valueDeltaText, taxDeltaText, reductionText, thresholdText);

  setSummaryClass(elements.valueDelta, valueDelta);
  setSummaryClass(elements.taxDelta, taxDelta);
  setSummaryClass(elements.taxReductionPercent, taxReductionPercent, true);
  syncFixedResultClasses();

  const rows = [
    makeRow("Площадь", `${currentScenario.area.toLocaleString("ru-RU")} кв. м`, `${forecastScenario.area.toLocaleString("ru-RU")} кв. м`),
    makeRow("УПКС с учетом факторов", rubles(current.adjustedUpks), rubles(forecast.adjustedUpks)),
    makeRow("Сводный коэффициент ценообразующих факторов", coefficient(current.totalFactor), coefficient(forecast.totalFactor)),
    makeRow("Кадастровая стоимость", rubles(current.cadastralValue), rubles(forecast.cadastralValue)),
    makeRow(
      "Текущая кадастровая стоимость по сведениям правообладателя",
      declaredCadastralValue > 0 ? rubles(declaredCadastralValue) : "Не указана",
      declaredCadastralValue > 0 ? rubles(declaredCadastralValue) : "Не указана"
    ),
    makeRow("Налоговый вычет", `${currentTax.deductArea.toLocaleString("ru-RU")} кв. м, ${rubles(currentTax.deductValue)}`, `${forecast.deductArea.toLocaleString("ru-RU")} кв. м, ${rubles(forecast.deductValue)}`),
    makeRow("Налоговая база", rubles(currentTax.taxableBase), rubles(forecast.taxableBase)),
    makeRow("Налоговая ставка", percent(currentTax.rate), percent(forecast.rate)),
    makeRow("Основание ставки", currentTax.rateReason, forecast.rateReason),
    makeRow("Снижение по налоговой льготе", rubles(currentTax.benefitValue), rubles(forecast.benefitValue)),
    makeRow(annualTaxLabel, rubles(currentTax.annualTax), rubles(forecast.annualTax)),
    makeRow("Вероятное снижение налоговой нагрузки от текущей", "0 %", reductionText),
    makeRow("ВРИ", current.useLabel, forecast.useLabel),
    makeRow("Инженерное обеспечение", current.infrastructureLabel, forecast.infrastructureLabel),
    makeRow("ЗОУИТ и ограничения", current.restrictionLabel, forecast.restrictionLabel),
    makeRow("Транспортная доступность", optionLabel("transportAccess", currentScenario.transportAccess), optionLabel("transportAccess", forecastScenario.transportAccess)),
    makeRow("Социальная инфраструктура", optionLabel("socialInfrastructure", currentScenario.socialInfrastructure), optionLabel("socialInfrastructure", forecastScenario.socialInfrastructure)),
    makeRow("Положительный локальный центр", optionLabel("positiveCenter", currentScenario.positiveCenter), optionLabel("positiveCenter", forecastScenario.positiveCenter)),
    makeRow("Отрицательный локальный центр", optionLabel("negativeCenter", currentScenario.negativeCenter), optionLabel("negativeCenter", forecastScenario.negativeCenter)),
    makeRow("Коэффициент ВРИ", factorText(current, "Коэффициент ВРИ к группировке объектов"), factorText(forecast, "Коэффициент ВРИ к группировке объектов")),
    makeRow("Коэффициент местоположения и окружения", coefficient([
      "Коэффициент транспортной доступности",
      "Коэффициент социальной инфраструктуры",
      "Коэффициент положительного локального центра",
      "Коэффициент отрицательного локального центра",
      "Коэффициент водоемов и рекреации",
      "Коэффициент железнодорожной инфраструктуры",
      "Коэффициент покупательской активности"
    ].reduce((total, label) => total * (current.factors.find((factor) => factor.label === label)?.value || 1), 1)), coefficient([
      "Коэффициент транспортной доступности",
      "Коэффициент социальной инфраструктуры",
      "Коэффициент положительного локального центра",
      "Коэффициент отрицательного локального центра",
      "Коэффициент водоемов и рекреации",
      "Коэффициент железнодорожной инфраструктуры",
      "Коэффициент покупательской активности"
    ].reduce((total, label) => total * (forecast.factors.find((factor) => factor.label === label)?.value || 1), 1)))
  ];

  if (!isLand(elements.objectType.value)) {
    rows.push(
      makeRow("Функциональное назначение ОКС", current.purposeLabel, forecast.purposeLabel),
      makeRow("Перечень статьи 378.2 НК РФ", current.article378 ? "Признак применен" : "Признак не применен", forecast.article378 ? "Признак применен" : "Признак не применен"),
      makeRow("Доля торговых, офисных и сервисных площадей", percent(currentScenario.commercialShare), percent(forecastScenario.commercialShare)),
      makeRow("Стадия объекта", current.stageLabel, forecast.stageLabel),
      makeRow("Капитальность стен", current.materialLabel, forecast.materialLabel),
      makeRow("Группа капитальности", current.capitalLabel, forecast.capitalLabel),
      makeRow("Техническое состояние", current.conditionLabel, forecast.conditionLabel),
      makeRow("Эффективный возраст", `${current.effectiveAge.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} лет`, `${forecast.effectiveAge.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} лет`),
      makeRow("Расчетный физический износ", percent(current.wearPercent), percent(forecast.wearPercent)),
      makeRow("Коэффициент функционального назначения", factorText(current, "Коэффициент функционального назначения ОКС"), factorText(forecast, "Коэффициент функционального назначения ОКС"))
    );
  }

  if (isLand(elements.objectType.value)) {
    rows.push(
      makeRow("Категория земель", optionLabel("landCategory", currentScenario.landCategory), optionLabel("landCategory", forecastScenario.landCategory)),
      makeRow("Конфигурация земельного участка", optionLabel("landForm", currentScenario.landForm), optionLabel("landForm", forecastScenario.landForm)),
      makeRow("Плотность застройки земельного участка", percent(currentScenario.buildDensity), percent(forecastScenario.buildDensity)),
      makeRow("Вид сельскохозяйственных угодий", optionLabel("agriLandType", currentScenario.agriLandType), optionLabel("agriLandType", forecastScenario.agriLandType)),
      makeRow("Почвенные свойства", optionLabel("soilQuality", currentScenario.soilQuality), optionLabel("soilQuality", forecastScenario.soilQuality))
    );
  }

  elements.resultRows.replaceChildren(...rows);

  const notices = [];
  if (declaredCadastralValue > 0) {
    const currentGap = current.cadastralValue - declaredCadastralValue;
    const forecastGap = forecast.cadastralValue - declaredCadastralValue;
    if (useDeclaredTaxMode) {
      rows.push(
        makeRow(
          "Налоговая нагрузка за год по расчетной кадастровой стоимости",
          rubles(current.annualTax),
          rubles(forecast.annualTax)
        )
      );
    }
    rows.push(
      makeRow(
        "Отклонение текущего расчета от указанной кадастровой стоимости",
        `${currentGap >= 0 ? "+" : ""}${rubles(currentGap)}`,
        `${forecastGap >= 0 ? "+" : ""}${rubles(forecastGap)}`
      )
    );
    elements.resultRows.replaceChildren(...rows);
    if (useDeclaredTaxMode) {
      notices.push(
        noticeParagraph(
          "Текущая налоговая нагрузка рассчитана по указанной кадастровой стоимости, а прогнозная налоговая нагрузка — по расчетной кадастровой стоимости после изменений."
        )
      );
    } else {
      notices.push(
        noticeParagraph(
          "Указанная текущая кадастровая стоимость сохранена для сверки, но налоговая нагрузка в обеих колонках рассчитана по расчетной кадастровой стоимости."
        )
      );
    }
  }

  if (crossedThreshold) {
    notices.push(noticeParagraph("Кадастровая стоимость в прогнозе пересекает порог 300 млн руб. Для ОКС применяется предельная ставка 2,5 %, для земельного участка предельная ставка составляет 1,5 %.", "danger"));
  } else if (overThreshold) {
    notices.push(noticeParagraph("Кадастровая стоимость превышает порог 300 млн руб.; применена повышенная налоговая ставка по правилам 2025-2026 годов.", "warning"));
  }

  if (forecast.article378 && !current.article378) {
    notices.push(noticeParagraph("В прогнозе появился признак объекта из перечня статьи 378.2 НК РФ. Это может изменить налоговую ставку и исключить ограничение роста налога для физического лица.", "warning"));
  }

  if (elements.objectType.value === "land" && currentScenario.use !== forecastScenario.use) {
    notices.push(noticeParagraph("Смена ВРИ земельного участка может изменить налоговую ставку с 0,3 % на 1,5 % и одновременно изменить УПКС по группировке объектов.", "warning"));
  }

  if (currentScenario.purpose !== forecastScenario.purpose && !isLand(elements.objectType.value)) {
    notices.push(noticeParagraph("Изменение функционального назначения ОКС отражено как изменение группировки и доходности использования. Для торговых, офисных и сервисных объектов дополнительно проверяется перечень статьи 378.2 НК РФ.", "warning"));
  }

  if (currentScenario.infrastructure !== forecastScenario.infrastructure) {
    notices.push(noticeParagraph("Изменение инженерного обеспечения отражено через поправку к УПКС: наличие газа и централизованных сетей может повышать расчетный показатель на 10-30 %."));
  }

  if (currentTax.growthLimitApplied || forecast.growthLimitApplied) {
    notices.push(noticeParagraph("Ограничение роста налога применено расчетно. Оно не применяется к объектам из перечня статьи 378.2 НК РФ и требует проверки оснований по налоговому периоду.", "warning"));
  }

  if (!notices.length) {
    notices.push(noticeParagraph("Существенные налоговые риски по заданным характеристикам не выявлены. Итоговый расчет остается предварительным и требует сверки с утвержденными результатами ГКО, сведениями ЕГРН и ставками конкретного муниципального образования или субъекта РФ."));
  }

  elements.notice.replaceChildren(...notices);
}

function copyCurrentToForecast() {
  changeControllers.forEach((controller) => {
    controller.toggle.checked = false;
    controller.forecast.value = controller.current.value;
    applyChangeControllerState(controller);
  });
  updateResult();
}

function applyGroupingDefaults() {
  const grouping = elements.grouping.value;
  const use = GROUPING_USE[grouping] || "other";
  const purpose = GROUPING_PURPOSE[grouping] || "utility";
  elements.currentUse.value = use;
  elements.forecastUse.value = use;
  setScenarioValue("current", "purpose", purpose);
  setScenarioValue("forecast", "purpose", purpose);
  setRegionalTableDefault();
  void applyRegionalUpks();
}

function applyObjectTypeRules() {
  const type = elements.objectType.value;

  if (isLand(type)) {
    elements.grouping.value = "garden";
    elements.currentUse.value = "individualHousing";
    elements.forecastUse.value = "business";
    setScenarioValue("current", "landCategory", "settlement");
    setScenarioValue("forecast", "landCategory", "settlement");
  } else if (type === "other") {
    elements.grouping.value = "business";
    elements.currentUse.value = "business";
    elements.forecastUse.value = "business";
    setScenarioValue("current", "purpose", "office");
    setScenarioValue("forecast", "purpose", "office");
    setScenarioValue("current", "commercialShare", 80);
    setScenarioValue("forecast", "commercialShare", 80);
  } else if (type === "special") {
    elements.grouping.value = "business";
    elements.currentUse.value = "business";
    elements.forecastUse.value = "business";
    setScenarioValue("current", "list378", "yes");
    setScenarioValue("forecast", "list378", "yes");
  }

  setRegionalTableDefault();
  void applyRegionalUpks();
}

function wireControl(control) {
  if (control.dataset.ready === "yes") return;
  control.addEventListener("input", updateResult);
  control.addEventListener("change", updateResult);
  control.dataset.ready = "yes";
}

document.querySelectorAll("input, select").forEach(wireControl);
elements.calculate.addEventListener("click", updateResult);
elements.copyCurrent.addEventListener("click", copyCurrentToForecast);
elements.grouping.addEventListener("change", applyGroupingDefaults);
elements.objectType.addEventListener("change", applyObjectTypeRules);
elements.location.addEventListener("change", () => {
  void applyRegionalUpks();
});
elements.regionalYear.addEventListener("change", () => {
  void applyRegionalUpks();
});
elements.regionalTable.addEventListener("change", () => {
  void applyRegionalUpks();
});

void initializeRegistryData();
