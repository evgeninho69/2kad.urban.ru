const PORTAL_ROUTE = 'tver-masterplan';
const PORTAL_HREF = '/tver-masterplan/';
const PORTAL_LABEL = 'Мастер-план Твери';

const ensurePortalLink = (container, options = {}) => {
  if (!container) return;

  const existing = container.querySelector(`[data-route="${PORTAL_ROUTE}"]`);
  if (existing) return;

  const link = document.createElement('a');
  link.href = PORTAL_HREF;
  link.textContent = PORTAL_LABEL;
  link.setAttribute('data-route', PORTAL_ROUTE);

  if (options.className) {
    link.className = options.className;
  }

  if (options.mobile) {
    link.setAttribute('data-mobile-link', '');
  }

  container.append(link);
};

export function initNav() {
  const nav = document.querySelector('[data-site-nav]');

  ensurePortalLink(document.querySelector('.nav-links'), { className: 'nav-link' });
  ensurePortalLink(document.querySelector('.menu-links'), { mobile: true });

  document.querySelectorAll(`[data-route="${PORTAL_ROUTE}"]`).forEach((link) => {
    if (link.textContent.trim() !== PORTAL_LABEL) {
      link.textContent = PORTAL_LABEL;
    }
    if (link.getAttribute('href') !== PORTAL_HREF) {
      link.setAttribute('href', PORTAL_HREF);
    }
  });

  const routeLinks = document.querySelectorAll('[data-route]');

  const normalizedPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
  const currentFile = normalizedPath.split('/').pop() || 'index.html';
  const inServices = normalizedPath.includes('/services/');
  const inPortal = normalizedPath.includes('/tver-masterplan/');

  if (inPortal) {
    const statusLabel = document.querySelector('.status-pill span:not(.dot)');
    if (statusLabel && statusLabel.textContent.trim() !== PORTAL_LABEL) {
      statusLabel.textContent = PORTAL_LABEL;
    }
  }

  const isRouteActive = (route) => {
    if (!route) return false;

    if (route === 'home') {
      return !inServices && !inPortal && (currentFile === '' || currentFile === 'index.html');
    }

    if (route === 'services') {
      return inServices;
    }

    if (route === PORTAL_ROUTE) {
      return inPortal;
    }

    // Keep cases navigation active on individual case pages.
    if (route.toLowerCase() === 'projects.html') {
      return currentFile === 'projects.html' || normalizedPath.includes('/cases/');
    }

    return currentFile === route.toLowerCase();
  };

  routeLinks.forEach((link) => {
    const route = link.getAttribute('data-route');
    const active = isRouteActive(route);

    link.classList.toggle('active', active);
    link.classList.toggle('is-active', active);

    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (!nav) return;

  const syncScrolledState = () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  };

  syncScrolledState();
  window.addEventListener('scroll', syncScrolledState, { passive: true });
}
