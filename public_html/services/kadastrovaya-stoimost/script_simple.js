const THRESHOLD = 300000000;

const OBJECT_TYPE_OPTIONS = [
  { value: "house", label: "Жилой дом" },
  { value: "flat", label: "Квартира" },
  { value: "room", label: "Комната" },
  { value: "land", label: "Земельный участок" },
  { value: "garage", label: "Гараж" },
  { value: "parkingSpace", label: "Машино-место" },
  { value: "apartment", label: "Апартаменты" },
  { value: "office", label: "Офисное здание или помещение" },
  { value: "retail", label: "Торговый объект" },
  { value: "retailEntertainment", label: "Торгово-развлекательный объект" },
  { value: "warehouse", label: "Складской объект" },
  { value: "production", label: "Производственный объект" },
  { value: "hotel", label: "Гостиница" },
  { value: "public", label: "Объект общественного назначения" },
  { value: "medical", label: "Медицинский объект" },
  { value: "education", label: "Объект образования" },
  { value: "sport", label: "Спортивный объект" },
  { value: "administrative", label: "Административный объект" },
  { value: "multifunction", label: "Многофункциональный объект" },
  { value: "unfinished", label: "Объект незавершенного строительства" },
  { value: "other", label: "Иной объект" }
];

const USE_OPTIONS = [
  { value: "residential", label: "Жилая эксплуатация" },
  { value: "individualHousing", label: "ИЖС, ЛПХ, садоводство" },
  { value: "apartmentUse", label: "Апартаменты и временное проживание" },
  { value: "officeUse", label: "Офисное использование" },
  { value: "retailUse", label: "Торговое использование" },
  { value: "retailEntertainmentUse", label: "Торгово-развлекательное использование" },
  { value: "warehouseUse", label: "Складское использование" },
  { value: "productionUse", label: "Производственное использование" },
  { value: "hotelUse", label: "Гостиничное использование" },
  { value: "publicUse", label: "Общественное обслуживание" },
  { value: "medicalUse", label: "Медицинское использование" },
  { value: "educationUse", label: "Образовательное использование" },
  { value: "sportUse", label: "Спортивное использование" },
  { value: "administrativeUse", label: "Административное использование" },
  { value: "mixedUse", label: "Смешанное использование" },
  { value: "transportUse", label: "Транспортное использование" },
  { value: "agriculture", label: "Сельскохозяйственное использование" },
  { value: "recreation", label: "Отдых и рекреация" },
  { value: "engineeringUse", label: "Инженерно-коммунальное использование" },
  { value: "other", label: "Иное использование" }
];

const USE_FACTOR = {
  residential: 1,
  individualHousing: 1,
  apartmentUse: 1.08,
  officeUse: 1.26,
  retailUse: 1.34,
  retailEntertainmentUse: 1.42,
  warehouseUse: 1.11,
  productionUse: 1.16,
  hotelUse: 1.21,
  publicUse: 0.9,
  medicalUse: 0.97,
  educationUse: 0.92,
  sportUse: 0.94,
  administrativeUse: 1.12,
  mixedUse: 1.18,
  engineeringUse: 0.96,
  agriculture: 0.72,
  business: 1.34,
  industry: 1.16,
  public: 0.88,
  recreation: 0.95,
  transportUse: 0.92,
  transport: 0.92,
  other: 0.9
};

const CAPITAL_FACTOR = {
  capital: 1,
  mixed: 0.92,
  light: 0.84
};

const INFRA_FACTOR = {
  minimal: 0.9,
  base: 1,
  improved: 1.12,
  full: 1.24
};

const RESTRICTION_FACTOR = {
  none: 1,
  moderate: 0.93,
  strong: 0.82
};

const DEDUCTION_AREA = {
  room: 10,
  flat: 20,
  house: 50
};

const RESIDENTIAL_TAX_TYPES = new Set([
  "house",
  "flat",
  "room",
  "garage",
  "parkingSpace"
]);

const LAND_REDUCED_RATE_USES = new Set([
  "individualHousing",
  "agriculture",
  "residential"
]);

const HIGH_VALUE_USE_TYPES = new Set([
  "business",
  "officeUse",
  "retailUse",
  "retailEntertainmentUse",
  "administrativeUse",
  "mixedUse"
]);

const LEGACY_USE_MAP = {
  business: "retailUse",
  industry: "productionUse",
  public: "publicUse",
  transport: "transportUse"
};

const elements = {
  objectType: document.getElementById("objectType"),
  taxpayerType: document.getElementById("taxpayerType"),
  currentCadastralValue: document.getElementById("currentCadastralValue"),
  currentArea: document.getElementById("currentArea"),
  currentUse: document.getElementById("currentUse"),
  currentCapital: document.getElementById("currentCapital"),
  currentInfrastructure: document.getElementById("currentInfrastructure"),
  currentRestriction: document.getElementById("currentRestriction"),
  ownershipShare: document.getElementById("ownershipShare"),
  ownershipMonths: document.getElementById("ownershipMonths"),
  taxBenefit: document.getElementById("taxBenefit"),
  previousTax: document.getElementById("previousTax"),
  forecastArea: document.getElementById("forecastArea"),
  forecastUse: document.getElementById("forecastUse"),
  forecastCapital: document.getElementById("forecastCapital"),
  forecastInfrastructure: document.getElementById("forecastInfrastructure"),
  forecastRestriction: document.getElementById("forecastRestriction"),
  calculate: document.getElementById("calculate"),
  forecastValue: document.getElementById("forecastValue"),
  valueDelta: document.getElementById("valueDelta"),
  taxDelta: document.getElementById("taxDelta"),
  taxReductionPercent: document.getElementById("taxReductionPercent"),
  resultRows: document.getElementById("resultRows"),
  valueDeltaFixed: document.getElementById("valueDeltaFixed"),
  taxDeltaFixed: document.getElementById("taxDeltaFixed"),
  taxReductionPercentFixed: document.getElementById("taxReductionPercentFixed"),
  thresholdStateFixed: document.getElementById("thresholdStateFixed")
};

function numberValue(field, fallback = 0) {
  const value = Number(String(field?.value ?? "").replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rubles(value) {
  return `${Math.round(value).toLocaleString("ru-RU")} руб.`;
}

function percent(value, digits = 2) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: digits })} %`;
}

function optionLabel(field) {
  const option = field.options[field.selectedIndex];
  return option ? option.textContent.trim() : "";
}

function normalizeUseValue(value) {
  return LEGACY_USE_MAP[value] || value;
}

function setSelectOptions(field, options, preferredValue) {
  const fallbackValue = options[0]?.value || "";
  const selectedValue = options.some((option) => option.value === preferredValue)
    ? preferredValue
    : fallbackValue;

  const optionNodes = options.map((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = option.value === selectedValue;
    return node;
  });

  field.replaceChildren(...optionNodes);
  field.value = selectedValue;
}

function initializeSelectFields() {
  const currentObjectType = elements.objectType.value || "house";
  const currentUse = normalizeUseValue(elements.currentUse.value || "residential");
  const forecastUse = normalizeUseValue(elements.forecastUse.value || "retailUse");

  setSelectOptions(elements.objectType, OBJECT_TYPE_OPTIONS, currentObjectType);
  setSelectOptions(elements.currentUse, USE_OPTIONS, currentUse);
  setSelectOptions(elements.forecastUse, USE_OPTIONS, forecastUse);
}

function isLand(type) {
  return type === "land";
}

function scenarioFactor(type, use, capital, infrastructure, restriction) {
  const useFactor = USE_FACTOR[use] || 1;
  const capitalFactor = isLand(type) ? 1 : (CAPITAL_FACTOR[capital] || 1);
  const infraFactor = INFRA_FACTOR[infrastructure] || 1;
  const restrictionFactor = RESTRICTION_FACTOR[restriction] || 1;
  return useFactor * capitalFactor * infraFactor * restrictionFactor;
}

function taxRate(type, taxpayerType, use, cadastralValue) {
  if (isLand(type)) {
    if (cadastralValue > THRESHOLD) {
      return { rate: 1.5, reason: "Земельный участок дороже 300 млн руб." };
    }
    if (LAND_REDUCED_RATE_USES.has(use)) {
      return { rate: 0.3, reason: "Льготный ВРИ земельного участка" };
    }
    return { rate: 1.5, reason: "Иной ВРИ земельного участка" };
  }

  if (cadastralValue > THRESHOLD) {
    return { rate: 2.5, reason: "Объект дороже 300 млн руб." };
  }
  if (taxpayerType === "organization") {
    return { rate: 2, reason: "Кадастровая база для организации" };
  }
  if (RESIDENTIAL_TAX_TYPES.has(type)) {
    return { rate: 0.1, reason: "Жилой объект или гараж" };
  }
  if (HIGH_VALUE_USE_TYPES.has(use)) {
    return { rate: 2, reason: "Торгово-офисное или деловое использование" };
  }
  return { rate: 0.5, reason: "Прочий объект физического лица" };
}

function calculateTax({ type, taxpayerType, use, cadastralValue, area, share, months, benefit, previousTax }) {
  const safeArea = Math.max(0.1, area);
  const baseValue = Math.max(0, cadastralValue);
  const deductArea = taxpayerType === "person" ? Math.min(safeArea, DEDUCTION_AREA[type] || 0) : 0;
  const cadastralPerSquare = baseValue / safeArea;
  const deductValue = cadastralPerSquare * deductArea;
  const taxableBase = Math.max(0, baseValue - deductValue);
  const rateInfo = taxRate(type, taxpayerType, use, baseValue);
  const rawTax = taxableBase * (rateInfo.rate / 100) * share * months;
  const benefitValue = rawTax * benefit;
  let annualTax = Math.max(0, rawTax - benefitValue);

  if (taxpayerType === "person" && previousTax > 0 && annualTax > previousTax * 1.1) {
    annualTax = previousTax * 1.1;
  }

  return {
    rate: rateInfo.rate,
    rateReason: rateInfo.reason,
    deductArea,
    deductValue,
    taxableBase,
    annualTax
  };
}

function setSummaryClass(target, delta, goodWhenIncrease = false) {
  const card = target.closest(".summary-item, .results-footer__item");
  if (!card) return;
  const bad = goodWhenIncrease ? delta < 0 : delta > 0;
  const good = goodWhenIncrease ? delta > 0 : delta < 0;
  card.classList.toggle("is-positive", bad);
  card.classList.toggle("is-negative", good);
}

function makeRow(label, current, forecast) {
  const row = document.createElement("tr");
  const c0 = document.createElement("td");
  const c1 = document.createElement("td");
  const c2 = document.createElement("td");
  c0.textContent = label;
  c1.textContent = current;
  c2.textContent = forecast;
  row.append(c0, c1, c2);
  return row;
}

function updateVisibility() {
  const land = isLand(elements.objectType.value);
  [elements.currentCapital, elements.forecastCapital].forEach((field) => {
    field.disabled = land;
  });
}

function updateResult() {
  updateVisibility();

  const type = elements.objectType.value;
  const taxpayerType = elements.taxpayerType.value;
  const currentCad = Math.max(0, numberValue(elements.currentCadastralValue, 0));
  const currentArea = Math.max(0.1, numberValue(elements.currentArea, 0.1));
  const forecastArea = Math.max(0.1, numberValue(elements.forecastArea, currentArea));
  const share = clamp(numberValue(elements.ownershipShare, 100), 1, 100) / 100;
  const months = clamp(numberValue(elements.ownershipMonths, 12), 1, 12) / 12;
  const benefit = clamp(numberValue(elements.taxBenefit, 0), 0, 100) / 100;
  const previousTax = Math.max(0, numberValue(elements.previousTax, 0));

  const currentUse = elements.currentUse.value;
  const currentCapital = elements.currentCapital.value;
  const currentInfrastructure = elements.currentInfrastructure.value;
  const currentRestriction = elements.currentRestriction.value;
  const forecastUse = elements.forecastUse.value;
  const forecastCapital = elements.forecastCapital.value;
  const forecastInfrastructure = elements.forecastInfrastructure.value;
  const forecastRestriction = elements.forecastRestriction.value;

  const currentFactor = scenarioFactor(type, currentUse, currentCapital, currentInfrastructure, currentRestriction);
  const forecastFactor = scenarioFactor(type, forecastUse, forecastCapital, forecastInfrastructure, forecastRestriction);
  const areaFactor = currentArea > 0 ? forecastArea / currentArea : 1;
  const factorRatio = currentFactor > 0 ? forecastFactor / currentFactor : 1;
  const forecastCad = Math.max(0, currentCad * areaFactor * factorRatio);

  const currentTax = calculateTax({
    type,
    taxpayerType,
    use: currentUse,
    cadastralValue: currentCad,
    area: currentArea,
    share,
    months,
    benefit,
    previousTax
  });
  const forecastTax = calculateTax({
    type,
    taxpayerType,
    use: forecastUse,
    cadastralValue: forecastCad,
    area: forecastArea,
    share,
    months,
    benefit,
    previousTax
  });

  const valueDelta = forecastCad - currentCad;
  const taxDelta = forecastTax.annualTax - currentTax.annualTax;
  const taxReductionPercent = currentTax.annualTax > 0
    ? ((currentTax.annualTax - forecastTax.annualTax) / currentTax.annualTax) * 100
    : 0;
  const crossedThreshold = currentCad <= THRESHOLD && forecastCad > THRESHOLD;
  const overThreshold = currentCad > THRESHOLD || forecastCad > THRESHOLD;
  const thresholdText = crossedThreshold
    ? "Пересечен в прогнозе"
    : overThreshold
      ? "Превышен"
      : "Не пересечен";

  elements.forecastValue.textContent = rubles(forecastCad);
  elements.valueDelta.textContent = `${valueDelta >= 0 ? "+" : ""}${rubles(valueDelta)}`;
  elements.taxDelta.textContent = `${taxDelta >= 0 ? "+" : ""}${rubles(taxDelta)}`;
  elements.taxReductionPercent.textContent = `${taxReductionPercent >= 0 ? "+" : ""}${percent(taxReductionPercent)}`;
  elements.valueDeltaFixed.textContent = elements.valueDelta.textContent;
  elements.taxDeltaFixed.textContent = elements.taxDelta.textContent;
  elements.taxReductionPercentFixed.textContent = elements.taxReductionPercent.textContent;
  elements.thresholdStateFixed.textContent = thresholdText;

  setSummaryClass(elements.valueDelta, valueDelta);
  setSummaryClass(elements.taxDelta, taxDelta);
  setSummaryClass(elements.taxReductionPercent, taxReductionPercent, true);
  setSummaryClass(elements.valueDeltaFixed, valueDelta);
  setSummaryClass(elements.taxDeltaFixed, taxDelta);
  setSummaryClass(elements.taxReductionPercentFixed, taxReductionPercent, true);
  setSummaryClass(elements.thresholdStateFixed, overThreshold ? 1 : -1);

  const rows = [
    makeRow("Площадь", `${currentArea.toLocaleString("ru-RU")} кв. м`, `${forecastArea.toLocaleString("ru-RU")} кв. м`),
    makeRow("ВРИ", optionLabel(elements.currentUse), optionLabel(elements.forecastUse)),
    makeRow("Капитальность стен", optionLabel(elements.currentCapital), optionLabel(elements.forecastCapital)),
    makeRow("Инженерное обеспечение", optionLabel(elements.currentInfrastructure), optionLabel(elements.forecastInfrastructure)),
    makeRow("ЗОУИТ и ограничения", optionLabel(elements.currentRestriction), optionLabel(elements.forecastRestriction)),
    makeRow("Укрупненный коэффициент", currentFactor.toLocaleString("ru-RU", { maximumFractionDigits: 3 }), forecastFactor.toLocaleString("ru-RU", { maximumFractionDigits: 3 })),
    makeRow("Кадастровая стоимость", rubles(currentCad), rubles(forecastCad)),
    makeRow("Налоговый вычет", `${currentTax.deductArea.toLocaleString("ru-RU")} кв. м, ${rubles(currentTax.deductValue)}`, `${forecastTax.deductArea.toLocaleString("ru-RU")} кв. м, ${rubles(forecastTax.deductValue)}`),
    makeRow("Налоговая база", rubles(currentTax.taxableBase), rubles(forecastTax.taxableBase)),
    makeRow("Налоговая ставка", percent(currentTax.rate, 2), percent(forecastTax.rate, 2)),
    makeRow("Основание ставки", currentTax.rateReason, forecastTax.rateReason),
    makeRow("Налоговая нагрузка за год", rubles(currentTax.annualTax), rubles(forecastTax.annualTax)),
    makeRow("Вероятное снижение налоговой нагрузки от текущей", "0 %", `${taxReductionPercent >= 0 ? "+" : ""}${percent(taxReductionPercent)}`),
    makeRow("Порог 300 млн руб.", currentCad > THRESHOLD ? "Превышен" : "Не превышен", forecastCad > THRESHOLD ? "Превышен" : "Не превышен")
  ];

  elements.resultRows.replaceChildren(...rows);
}

document.querySelectorAll("input, select").forEach((control) => {
  control.addEventListener("input", updateResult);
  control.addEventListener("change", updateResult);
});
elements.calculate.addEventListener("click", updateResult);

initializeSelectFields();
updateResult();
