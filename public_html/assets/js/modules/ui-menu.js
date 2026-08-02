export function initMenu() {
  const menuButton = document.querySelector('[data-menu-btn]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const menuBackdrop = document.querySelector('[data-menu-backdrop]');
  const menuClose = document.querySelector('[data-menu-close]');
  const mobileLinks = document.querySelectorAll('[data-mobile-link]');

  if (!menuButton || !menuPanel || !menuBackdrop) return;

  const setOpen = (open) => {
    menuPanel.classList.toggle('open', open);
    menuBackdrop.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  menuButton.addEventListener('click', () => {
    const open = !menuPanel.classList.contains('open');
    setOpen(open);
  });

  if (menuClose) {
    menuClose.addEventListener('click', () => setOpen(false));
  }

  menuBackdrop.addEventListener('click', () => setOpen(false));
  mobileLinks.forEach(link => link.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });
}
