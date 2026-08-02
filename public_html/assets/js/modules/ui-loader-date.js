export function initLoaderDate({ reduceMotion = false } = {}) {
  const dateValue = new Date();
  const dateText = `${String(dateValue.getDate()).padStart(2, '0')}.${String(dateValue.getMonth() + 1).padStart(2, '0')}.${dateValue.getFullYear()}`;

  const dateNodes = document.querySelectorAll('[data-current-date]');
  dateNodes.forEach(node => {
    node.textContent = dateText;
  });

  const loader = document.getElementById('loader');
  if (!loader) return;

  const hide = () => {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 380);
  };

  setTimeout(hide, reduceMotion ? 80 : 920);
}
