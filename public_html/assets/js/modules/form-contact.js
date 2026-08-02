const endpoint = '/api/contact-submissions';

const normalize = (value) => String(value || '').trim();

const validate = (payload) => {
  const errors = [];

  if (payload.name.length < 2) errors.push('Укажите имя.');
  if (payload.phone.length < 6) errors.push('Укажите телефон.');
  if (payload.projectType.length < 2) errors.push('Выберите тип проекта.');
  if (payload.message.length < 10) errors.push('Добавьте более подробное описание задачи.');
  if (!payload.consent) errors.push('Нужно согласие на обработку данных.');

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('E-mail указан некорректно.');
  }

  return errors;
};

export function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const statusNode = form.querySelector('[data-contact-status]');
  const submitButton = form.querySelector('[data-contact-submit]');

  const setStatus = (text, tone = 'muted') => {
    if (!statusNode) return;
    statusNode.textContent = text;
    statusNode.dataset.tone = tone;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);

    const payload = {
      name: normalize(data.get('name')),
      phone: normalize(data.get('phone')),
      email: normalize(data.get('email')),
      projectType: normalize(data.get('projectType')),
      message: normalize(data.get('message')),
      consent: data.get('consent') === 'on',
      website: normalize(data.get('website'))
    };

    const errors = validate(payload);
    if (errors.length) {
      setStatus(errors[0], 'error');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Отправка...';
    }

    setStatus('Отправляем заявку...', 'muted');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || 'Не удалось отправить заявку. Попробуйте позже.');
      }

      form.reset();
      setStatus('Заявка отправлена. Мы свяжемся с вами в ближайшее время.', 'success');
    } catch (error) {
      setStatus(error.message || 'Не удалось отправить заявку. Попробуйте позже.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить заявку';
      }
    }
  });
}
