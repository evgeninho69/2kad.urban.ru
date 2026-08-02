export function initParallax({ reduceMotion = false } = {}) {
  if (reduceMotion) return;

  const layers = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!layers.length) return;

  let ticking = false;

  const syncParallax = () => {
    const scrollY = window.scrollY;

    layers.forEach((layer) => {
      const speed = Number(layer.getAttribute('data-speed') || 0.08);
      const scale = Number(layer.getAttribute('data-scale') || 1);
      layer.style.transform = `translate3d(0, ${scrollY * speed}px, 0) scale(${scale})`;
    });

    ticking = false;
  };

  const requestSync = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(syncParallax);
  };

  syncParallax();
  window.addEventListener('scroll', requestSync, { passive: true });
}
