const POINTER_FX_SELECTOR = [
  '.card',
  '.service-card',
  '.process-step',
  '.deliverable',
  '.timeline-step',
  '.service-gallery .item',
  '.btn',
  '.page-link-chip',
  '.hero-quicklinks a',
  '.menu-links a'
].join(',');

export function initPointerEffects({ reduceMotion = false } = {}) {
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (reduceMotion || !pointerQuery.matches) return;

  const elements = Array.from(document.querySelectorAll(POINTER_FX_SELECTOR));
  if (!elements.length) return;

  elements.forEach((element) => {
    element.classList.add('fx-pointer-glow');

    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      element.style.setProperty('--glow-x', `${x}%`);
      element.style.setProperty('--glow-y', `${y}%`);
    }, { passive: true });

    element.addEventListener('pointerleave', () => {
      element.style.removeProperty('--glow-x');
      element.style.removeProperty('--glow-y');
    });
  });
}
