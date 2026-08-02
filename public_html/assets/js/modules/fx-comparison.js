export function initComparison() {
  const sliders = document.querySelectorAll('[data-comparison]');
  if (!sliders.length) return;

  sliders.forEach((slider) => {
    const input = slider.querySelector('[data-comparison-input]');
    const afterImage = slider.querySelector('[data-comparison-after]');
    const handle = slider.querySelector('[data-comparison-handle]');
    const overlay = slider.querySelector('[data-comparison-overlay]');
    const hint = slider.querySelector('[data-comparison-hint]');

    if (!input || !afterImage || !handle) return;

    const sync = (value) => {
      handle.style.left = `${value}%`;
      afterImage.style.clipPath = `polygon(0 0, ${value}% 0, ${value}% 100%, 0 100%)`;

      if (overlay) {
        overlay.style.opacity = value < 30 ? '0.25' : '1';
      }
    };

    input.addEventListener('input', (event) => {
      if (hint) hint.classList.add('hidden');
      sync(Number(event.target.value));
    });

    sync(Number(input.value));
  });
}
