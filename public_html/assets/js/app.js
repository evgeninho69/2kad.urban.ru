import { initLoaderDate } from './modules/ui-loader-date.js';
// Кастомный курсор отключён по запросу — используется обычный системный курсор.
// import { initCursor } from './modules/ui-cursor.js';
import { initMenu } from './modules/ui-menu.js';
import { initNav } from './modules/ui-nav.js';
import { initScrollProgress } from './modules/ui-scroll-progress.js';
import { initReveal } from './modules/fx-reveal.js';
import { initParallax } from './modules/fx-parallax.js';
import { initComparison } from './modules/fx-comparison.js';
import { initScramble } from './modules/fx-scramble.js';
import { initPointerEffects } from './modules/fx-interactions.js';
import { initContactForm } from './modules/form-contact.js';
import { initPortalSurvey } from './modules/portal-survey.js?v=20260803-1';
import { initPortalIdeas } from './modules/portal-ideas.js';
import { initPortalIdeaBank } from './modules/portal-idea-bank.js';
import { initPortalAdmin } from './modules/portal-admin.js?v=20260803-1';

const safeInit = (name, initFn) => {
  try {
    initFn();
  } catch (error) {
    console.warn(`[app] ${name} init failed`, error);
  }
};

const forceHideLoader = () => {
  const loader = document.getElementById('loader');
  if (!loader) return;

  loader.style.opacity = '0';
  loader.style.visibility = 'hidden';
  loader.style.display = 'none';
};

const bootstrap = () => {
  // Фикс кросс-ПК: не отключаем эффекты через prefers-reduced-motion,
  // чтобы визуальный слой был единым на разных устройствах.
  const reduceMotion = false;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    safeInit('lucide', () => window.lucide.createIcons());
  }

  // Курсор отключён по запросу — обычный системный.
  // safeInit('cursor', () => initCursor({ reduceMotion }));
  safeInit('menu', () => initMenu());
  safeInit('nav', () => initNav());
  safeInit('scroll-progress', () => initScrollProgress());
  safeInit('reveal', () => initReveal({ reduceMotion }));
  safeInit('parallax', () => initParallax({ reduceMotion }));
  safeInit('pointer-effects', () => initPointerEffects({ reduceMotion }));
  safeInit('comparison', () => initComparison());
  safeInit('scramble', () => initScramble({ reduceMotion }));
  safeInit('contact-form', () => initContactForm());
  safeInit('portal-survey', () => initPortalSurvey());
  safeInit('portal-ideas', () => initPortalIdeas());
  safeInit('portal-idea-bank', () => initPortalIdeaBank());
  safeInit('portal-admin', () => initPortalAdmin());

  const startLoader = () => {
    safeInit('loader-date', () => initLoaderDate({ reduceMotion }));

    // Safety fallback: если модуль лоадера не сработал на отдельном ПК,
    // принудительно убираем экран загрузки.
    window.setTimeout(forceHideLoader, 2200);
  };

  if (document.readyState === 'complete') {
    startLoader();
  } else {
    window.addEventListener('load', startLoader, { once: true });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
