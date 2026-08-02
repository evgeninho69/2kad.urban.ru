export function initReveal({ reduceMotion = false } = {}) {
  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!revealItems.length) return;

  if (reduceMotion) {
    revealItems.forEach((item) => item.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -36px 0px'
  });

  revealItems.forEach((item, index) => {
    if (!item.style.getPropertyValue('--reveal-delay')) {
      item.style.setProperty('--reveal-delay', `${(index % 5) * 55}ms`);
    }

    observer.observe(item);
  });
}
