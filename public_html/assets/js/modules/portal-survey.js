// Опрос анонимный: данные НЕ отправляются на сервер, обрабатываются только локально.
// Privacy meta endpoint и personal data flow для опроса удалены намеренно.
const PERSONAL_DATA_REQUEST_ENDPOINT = '/api/tver-portal/personal-data/requests';

const MAX_TOPICS = 5;
const OTHER_DISTRICT_VALUE = 'other';
const OTHER_SPACES_VALUE = 'other';

// Хелперы для формы персональных данных (initPersonalDataRequestForm):
// форма опроса анонимная, а форма запроса по 152-ФЗ — нет, она продолжает
// требовать версию политики и согласие.
const getPrivacyMeta = async () => {
  const response = await fetchJson('/api/tver-portal/privacy-meta');
  return response.data || null;
};

const applyPolicyVersion = (root, version) => {
  if (!root) return;
  const resolvedVersion = normalize(version) || '2026-05-20';

  root.querySelectorAll('[name="policyVersion"]').forEach((input) => {
    input.value = resolvedVersion;
  });

  document.querySelectorAll('[data-policy-version]').forEach((node) => {
    node.textContent = resolvedVersion;
  });
};

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
    throw new Error(body.error || 'Ошибка запроса. Попробуйте позже.');
  }

  return body;
};

const initSurveySelects = (root = document) => {
  const selects = Array.from(root.querySelectorAll('[data-survey-select]'));
  if (!selects.length) return;

  const closeAll = (except) => {
    selects.forEach((selectNode) => {
      if (selectNode === except) return;

      selectNode.dataset.open = 'false';
      const trigger = selectNode.querySelector('[data-select-trigger]');
      const menu = selectNode.querySelector('[data-select-menu]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    });
  };

  selects.forEach((selectNode) => {
    const hiddenInput = selectNode.querySelector('input[type="hidden"]');
    const trigger = selectNode.querySelector('[data-select-trigger]');
    const valueNode = selectNode.querySelector('[data-select-value]');
    const menu = selectNode.querySelector('[data-select-menu]');

    if (!hiddenInput || !trigger || !valueNode || !menu) return;

    const applyValue = (value, label) => {
      hiddenInput.value = value;
      valueNode.textContent = label || 'Выберите вариант';
      trigger.classList.toggle('is-empty', !value);
    };

    const initialOption = Array.from(menu.querySelectorAll('button[data-option-value]'))
      .find((option) => normalize(option.getAttribute('data-option-value')) === normalize(hiddenInput.value));
    if (initialOption) {
      applyValue(hiddenInput.value, initialOption.getAttribute('data-option-label') || initialOption.textContent || '');
    }

    trigger.addEventListener('click', () => {
      const isOpen = selectNode.dataset.open === 'true';
      if (isOpen) {
        closeAll();
      } else {
        closeAll(selectNode);
        selectNode.dataset.open = 'true';
        trigger.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
      }
    });

    menu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-option-value]');
      if (!option) return;

      const value = normalize(option.getAttribute('data-option-value'));
      const label = normalize(option.getAttribute('data-option-label') || option.textContent);

      applyValue(value, label);
      closeAll();
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!target.closest('[data-survey-select]')) {
      closeAll();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAll();
    }
  });
};

const initSurveyQuestionReveal = () => {
  const nodes = Array.from(document.querySelectorAll('[data-survey-reveal]'));
  if (!nodes.length) return;

  nodes.forEach((node) => {
    node.dataset.revealReady = 'true';
  });

  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-active'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-active');
      }
    });
  }, {
    threshold: 0.2
  });

  nodes.forEach((node) => observer.observe(node));
};

const initSurveyProgressReveal = () => {
  const nodes = Array.from(document.querySelectorAll('[data-survey-progress]'));
  if (!nodes.length) return;

  nodes.forEach((node) => {
    node.dataset.progressReady = 'true';
  });

  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-active'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-active');
      }
    });
  }, {
    threshold: 0.25
  });

  nodes.forEach((node) => observer.observe(node));
};

const initSurveyBlockReveal = () => {
  const blocks = Array.from(document.querySelectorAll('.tver-survey-block'));
  if (!blocks.length) return;

  const prefersReducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setFocusedBlock = (activeBlock) => {
    blocks.forEach((block) => {
      block.classList.toggle('is-focused', block === activeBlock);
    });
  };

  try {
    blocks.forEach((block, index) => {
      block.dataset.blockReveal = 'ready';
      block.style.setProperty('--survey-block-delay', `${Math.min(index, 8) * 70}ms`);
    });

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      blocks.forEach((block) => block.classList.add('is-pop'));
      setFocusedBlock(blocks[0] || null);
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-pop');
        }
      });
    }, {
      threshold: 0.18,
      rootMargin: '0px 0px -10% 0px'
    });

    const focusObserver = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length) {
        setFocusedBlock(visibleEntries[0].target);
      }
    }, {
      threshold: [0.35, 0.55, 0.75],
      rootMargin: '-8% 0px -32% 0px'
    });

    blocks.forEach((block) => {
      revealObserver.observe(block);
      focusObserver.observe(block);
    });
  } catch (_error) {
    blocks.forEach((block) => {
      block.classList.add('is-pop');
      block.classList.remove('is-focused');
      block.removeAttribute('data-block-reveal');
      block.style.removeProperty('--survey-block-delay');
    });
  }
};

const initTopicsLimit = (form, statusNode) => {
  const inputs = Array.from(form.querySelectorAll('input[name="topics"]'));
  if (!inputs.length) return;

  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      const selected = form.querySelectorAll('input[name="topics"]:checked');
      if (selected.length > MAX_TOPICS) {
        input.checked = false;
        setStatus(statusNode, `Можно выбрать не более ${MAX_TOPICS} тем.`, 'error');
      } else if (statusNode?.dataset.tone === 'error') {
        setStatus(statusNode, '', 'muted');
      }
    });
  });
};

const initConditionalFields = (form) => {
  const districtRadios = Array.from(form.querySelectorAll('input[name="districtChoice"]'));
  const districtOtherWrap = form.querySelector('[data-district-other-wrap]');
  const districtOtherInput = form.querySelector('input[name="districtOther"]');

  const spacesCheckboxes = Array.from(form.querySelectorAll('input[name="spacesMissing"]'));
  const spacesOtherWrap = form.querySelector('[data-spaces-other-wrap]');
  const spacesOtherInput = form.querySelector('input[name="spacesMissingOther"]');

  const updateDistrictState = () => {
    const selected = form.querySelector('input[name="districtChoice"]:checked');
    const showOther = normalize(selected?.value) === OTHER_DISTRICT_VALUE;

    if (districtOtherWrap) {
      districtOtherWrap.hidden = !showOther;
    }

    if (!showOther && districtOtherInput) {
      districtOtherInput.value = '';
    }
  };

  const updateSpacesState = () => {
    const showOther = spacesCheckboxes.some((checkbox) => checkbox.checked && normalize(checkbox.value) === OTHER_SPACES_VALUE);

    if (spacesOtherWrap) {
      spacesOtherWrap.hidden = !showOther;
    }

    if (!showOther && spacesOtherInput) {
      spacesOtherInput.value = '';
    }
  };

  districtRadios.forEach((radio) => {
    radio.addEventListener('change', updateDistrictState);
  });

  spacesCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateSpacesState);
  });

  updateDistrictState();
  updateSpacesState();

  return {
    reset: () => {
      updateDistrictState();
      updateSpacesState();
    }
  };
};

const initSatisfactionRange = (form) => {
  const input = form.querySelector('[data-satisfaction-range]');
  const output = form.querySelector('[data-satisfaction-value]');

  if (!input || !output) {
    return {
      reset: () => {}
    };
  }

  const sync = () => {
    output.textContent = normalize(input.value) || '3';
  };

  input.addEventListener('input', sync);
  sync();

  return {
    reset: sync
  };
};

const readCheckedValues = (form, name) => {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
    .map((node) => normalize(node.value))
    .filter(Boolean);
};

const buildComment = (payload) => {
  const chunks = [];

  if (payload.comment) {
    chunks.push(`Комментарий участника: ${payload.comment}`);
  }
  if (payload.participantContext) {
    chunks.push(`Контекст участия: ${payload.participantContext}`);
  }
  if (payload.transportProblems.length) {
    chunks.push(`Проблемы мобильности: ${payload.transportProblems.join(', ')}`);
  }
  if (payload.commuteTime) {
    chunks.push(`Время поездки: ${payload.commuteTime}`);
  }
  if (payload.carParkingIssues.length) {
    chunks.push('Авто/парковки/стоянки: ' + payload.carParkingIssues.join(', '));
  }
  if (payload.placesLove) {
    chunks.push(`Удачные пространства: ${payload.placesLove}`);
  }
  if (payload.spacesMissing.length) {
    chunks.push(`Чего не хватает: ${payload.spacesMissing.join(', ')}`);
  }
  if (payload.spacesMissingOther) {
    chunks.push(`Другое по пространствам: ${payload.spacesMissingOther}`);
  }
  if (payload.socialAccessSectors.length) {
    chunks.push('Сферы с проблемами доступности: ' + payload.socialAccessSectors.join(', '));
  }
  if (payload.socialObjectNeeds.length) {
    chunks.push('Недостающие объекты в районе: ' + payload.socialObjectNeeds.join(', '));
  }
  if (payload.socialObjectNeedsOther) {
    chunks.push('Доп. объекты для близости: ' + payload.socialObjectNeedsOther);
  }
  if (payload.ideaReady) {
    chunks.push(`Готовность к участию: ${payload.ideaReady}`);
  }
  if (payload.employmentStatus) {
    chunks.push(`Занятость: ${payload.employmentStatus}`);
  }
  if (payload.workLocation) {
    chunks.push(`Локация работы/учебы: ${payload.workLocation}`);
  }
  if (payload.economyPriorities.length) {
    chunks.push(`Приоритеты экономики: ${payload.economyPriorities.join(', ')}`);
  }
  if (payload.businessBarriers.length) {
    chunks.push(`Барьеры для бизнеса: ${payload.businessBarriers.join(', ')}`);
  }
  if (payload.ecologyProblems.length) {
    chunks.push(`Экологические проблемы: ${payload.ecologyProblems.join(', ')}`);
  }
  if (payload.heritageObjects) {
    chunks.push(`Объекты наследия: ${payload.heritageObjects}`);
  }
  if (payload.naturePlaces) {
    chunks.push(`Природные территории: ${payload.naturePlaces}`);
  }
  if (payload.tourismRoutes) {
    chunks.push(`Туристические маршруты: ${payload.tourismRoutes}`);
  }
  if (payload.agglomerationTrips) {
    chunks.push(`Поездки Тверь–Калининский район: ${payload.agglomerationTrips}`);
  }
  if (payload.intermunicipalNeeds.length) {
    chunks.push(`Межтерриториальные связи: ${payload.intermunicipalNeeds.join(', ')}`);
  }
  if (payload.topProjects) {
    chunks.push(`Топ-3 проекта: ${payload.topProjects}`);
  }

  return chunks.join('\n').slice(0, 2000);
};

const initSurveyForm = () => {
  const form = document.querySelector('[data-survey-form]');
  if (!form) return;

  const statusNode = form.querySelector('[data-survey-status]');
  const submitButton = form.querySelector('[data-survey-submit]');

  initTopicsLimit(form, statusNode);
  const conditionalState = initConditionalFields(form);
  const rangeState = initSatisfactionRange(form);

  const collectPayload = () => {
    const data = new FormData(form);

    const districtChoice = normalize(data.get('districtChoice'));
    const districtOther = normalize(data.get('districtOther'));
    const district = districtChoice === OTHER_DISTRICT_VALUE ? districtOther : districtChoice;

    const payload = {
      ageGroup: normalize(data.get('ageGroup')),
      districtChoice,
      district,
      districtOther,
      topics: data.getAll('topics').map((item) => normalize(item)).filter(Boolean),
      satisfaction: Number(data.get('satisfaction')),
      priorityProject: normalize(data.get('priorityProject')),
      participantContext: normalize(data.get('participantContext')),
      transportProblems: readCheckedValues(form, 'transportProblems'),
      commuteTime: normalize(data.get('commuteTime')),
      carParkingIssues: readCheckedValues(form, 'carParkingIssues'),
      placesLove: normalize(data.get('placesLove')),
      spacesMissing: readCheckedValues(form, 'spacesMissing'),
      spacesMissingOther: normalize(data.get('spacesMissingOther')),
      socialAccessSectors: readCheckedValues(form, 'socialAccessSectors'),
      socialObjectNeeds: readCheckedValues(form, 'socialObjectNeeds'),
      socialObjectNeedsOther: normalize(data.get('socialObjectNeedsOther')),
      ideaReady: normalize(data.get('ideaReady')),
      employmentStatus: normalize(data.get('employmentStatus')),
      workLocation: normalize(data.get('workLocation')),
      economyPriorities: readCheckedValues(form, 'economyPriorities'),
      businessBarriers: readCheckedValues(form, 'businessBarriers'),
      ecologyProblems: readCheckedValues(form, 'ecologyProblems'),
      heritageObjects: normalize(data.get('heritageObjects')),
      naturePlaces: normalize(data.get('naturePlaces')),
      tourismRoutes: normalize(data.get('tourismRoutes')),
      agglomerationTrips: normalize(data.get('agglomerationTrips')),
      intermunicipalNeeds: readCheckedValues(form, 'intermunicipalNeeds'),
      topProjects: normalize(data.get('topProjects')),
      comment: normalize(data.get('comment')),
    };

    // Сырые строковые значения из формы — нужны для валидации
    // (например, чтобы отличить «другая территория» от выбора из списка).
    payload._raw = { districtChoice, districtOther };

    return payload;
  };

  const validate = (payload) => {
    const raw = payload._raw;

    if (!payload.ageGroup) return 'Выберите возрастную группу.';
    if (!raw.districtChoice) return 'Выберите район проживания/активности.';
    if (raw.districtChoice === OTHER_DISTRICT_VALUE && raw.districtOther.length < 2) {
      return 'Уточните территорию в поле «Другая территория».';
    }
    if (payload.district.length < 2) return 'Укажите район.';
    if (!payload.topics.length) return 'Выберите хотя бы одну тему развития.';
    if (payload.topics.length > MAX_TOPICS) return `Можно выбрать не более ${MAX_TOPICS} тем.`;
    if (Number.isNaN(payload.satisfaction) || payload.satisfaction < 1 || payload.satisfaction > 5) {
      return 'Укажите оценку удовлетворенности от 1 до 5.';
    }
    return null;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const payload = collectPayload();
      const validationError = validate(payload);

      if (validationError) {
        setStatus(statusNode, validationError, 'error');
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Отправка...';
      }
      setStatus(statusNode, 'Отправляем анкету...', 'muted');

      try {
      await fetchJson('/api/tver-portal/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      form.reset();
      conditionalState.reset();
      rangeState.reset();

      setStatus(statusNode, 'Спасибо за участие! Ваши ответы зафиксированы анонимно.', 'success');
      if (submitButton) {
        submitButton.textContent = 'Спасибо! Анкета принята';
      }

      setTimeout(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Отправить анкету';
        }
      }, 5000);
    } catch (error) {
      setStatus(statusNode, error.message || 'Не удалось отправить анкету. Попробуйте позже.', 'error');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить анкету';
      }
    }
    } catch (fatalError) {
      // Защита от throw в collectPayload/validate (раньше тихо замораживало форму).
      console.error('[survey] submit failed:', fatalError);
      setStatus(statusNode, 'Ошибка отправки: ' + (fatalError && fatalError.message ? fatalError.message : 'попробуйте ещё раз'), 'error');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить анкету';
      }
    }
  });
};

const initPersonalDataRequestForm = () => {
  const form = document.querySelector('[data-personal-data-form]');
  if (!form) return;

  const statusNode = form.querySelector('[data-personal-data-status]');
  const submitButton = form.querySelector('[data-personal-data-submit]');

  const collectPayload = () => {
    const data = new FormData(form);

    return {
      fullName: normalize(data.get('fullName')),
      email: normalize(data.get('email')),
      phone: normalize(data.get('phone')),
      requestType: normalize(data.get('requestType')),
      message: normalize(data.get('message')),
      consent: data.get('consent') === 'on',
      policyVersion: normalize(data.get('policyVersion')),
      website: normalize(data.get('website'))
    };
  };

  const validate = (payload) => {
    if (payload.fullName.length < 2) return 'Укажите ФИО.';
    if (!payload.requestType) return 'Выберите тип запроса.';
    if (payload.message.length < 10) return 'Опишите запрос подробнее (не менее 10 символов).';
    if (!payload.consent) return 'Необходимо согласие на обработку персональных данных.';
    if (!payload.policyVersion) return 'Не удалось определить версию политики. Обновите страницу.';

    return null;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = collectPayload();
    const validationError = validate(payload);

    if (validationError) {
      setStatus(statusNode, validationError, 'error');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Отправка...';
    }

    setStatus(statusNode, 'Отправляем запрос...', 'muted');

    try {
      await fetchJson(PERSONAL_DATA_REQUEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      form.reset();
      form.querySelectorAll('[data-select-value]').forEach((node) => {
        node.textContent = 'Выберите вариант';
      });
      setStatus(statusNode, 'Запрос зарегистрирован. Ответ будет направлен на указанные контакты.', 'success');

      const meta = await getPrivacyMeta();
      applyPolicyVersion(form, meta?.policyVersion);
    } catch (error) {
      setStatus(statusNode, error.message || 'Не удалось отправить запрос.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить запрос';
      }
    }
  });

  getPrivacyMeta()
    .then((meta) => applyPolicyVersion(form, meta?.policyVersion))
    .catch(() => {
      setStatus(statusNode, 'Не удалось загрузить параметры политики ПДн. Попробуйте позже.', 'error');
    });
};

export function initPortalSurvey() {
  if (!document.querySelector('[data-survey-form]') && !document.querySelector('[data-personal-data-form]')) {
    return;
  }

  initSurveySelects(document);
  initSurveyBlockReveal();
  initSurveyQuestionReveal();
  initSurveyProgressReveal();
  initSurveyForm();
  initPersonalDataRequestForm();
}
