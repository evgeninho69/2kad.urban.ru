export function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;

  const syncProgress = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, ratio))}%`;
  };

  syncProgress();
  window.addEventListener('scroll', syncProgress, { passive: true });
  window.addEventListener('resize', syncProgress);
}
