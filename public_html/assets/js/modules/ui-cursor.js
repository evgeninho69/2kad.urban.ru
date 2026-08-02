const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'summary',
  'label',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
  '.card',
  '.service-card',
  '.process-step',
  '.deliverable',
  '.timeline-step',
  '.service-gallery .item',
  '[data-cursor-hover]'
].join(',');

const TEXT_SELECTOR = [
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"])',
  'textarea',
  'select',
  '[contenteditable="true"]'
].join(',');

const DRAG_SELECTOR = [
  '.comparison-input',
  '[data-comparison-input]',
  '[data-comparison]'
].join(',');

const resetCursorClasses = (root) => {
  root.classList.remove(
    'custom-cursor-hover',
    'custom-cursor-text',
    'custom-cursor-drag',
    'custom-cursor-press'
  );
};

export function initCursor({ reduceMotion = false } = {}) {
  const dot = document.getElementById('cursor-dot');
  const trail = document.getElementById('cursor-trail');
  const root = document.documentElement;
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let trailX = targetX;
  let trailY = targetY;
  let frameId = 0;
  let enabled = false;

  const canUseCursor = () => (
    Boolean(dot && trail)
    && pointerQuery.matches
    && !reduceMotion
    && !reducedMotionQuery.matches
  );

  const setElementPosition = (element, x, y) => {
    element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };

  const stopAnimation = () => {
    if (!frameId) return;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const animateTrail = () => {
    trailX += (targetX - trailX) * 0.18;
    trailY += (targetY - trailY) * 0.18;
    setElementPosition(trail, trailX, trailY);
    frameId = window.requestAnimationFrame(animateTrail);
  };

  const showCursor = () => {
    if (!enabled) return;

    root.classList.add('custom-cursor-enabled', 'custom-cursor-visible');

    if (!frameId) {
      trailX = targetX;
      trailY = targetY;
      setElementPosition(trail, trailX, trailY);
      frameId = window.requestAnimationFrame(animateTrail);
    }
  };

  const hideCursor = () => {
    root.classList.remove('custom-cursor-enabled', 'custom-cursor-visible');
    resetCursorClasses(root);
    stopAnimation();
  };

  const disableCursor = () => {
    enabled = false;
    hideCursor();
    root.classList.remove('custom-cursor-capable');

    if (dot) dot.style.display = 'none';
    if (trail) trail.style.display = 'none';
    document.body.style.cursor = '';
  };

  const enableCursor = () => {
    if (!canUseCursor()) {
      disableCursor();
      return;
    }

    enabled = true;
    root.classList.add('custom-cursor-capable');
    dot.style.display = '';
    trail.style.display = '';
    document.body.style.cursor = '';
  };

  const getCursorMode = (target) => {
    if (!(target instanceof Element)) return 'default';
    if (target.closest(TEXT_SELECTOR)) return 'text';
    if (target.closest(DRAG_SELECTOR)) return 'drag';
    if (target.closest(INTERACTIVE_SELECTOR)) return 'hover';
    return 'default';
  };

  const syncCursorMode = (target) => {
    resetCursorClasses(root);

    const mode = getCursorMode(target);
    if (mode !== 'default') {
      root.classList.add(`custom-cursor-${mode}`);
    }
  };

  const handlePointerMove = (event) => {
    if (!enabled || event.pointerType === 'touch') return;

    targetX = event.clientX;
    targetY = event.clientY;
    setElementPosition(dot, targetX, targetY);
    showCursor();
    syncCursorMode(event.target);
  };

  const handlePointerDown = (event) => {
    if (!enabled || event.pointerType === 'touch') return;
    root.classList.add('custom-cursor-press');
  };

  const handlePointerUp = () => {
    root.classList.remove('custom-cursor-press');
  };

  const handlePointerLeave = (event) => {
    if (event.relatedTarget) return;
    hideCursor();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      hideCursor();
    }
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  document.addEventListener('pointerleave', handlePointerLeave);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  [pointerQuery, reducedMotionQuery].forEach((query) => {
    query.addEventListener('change', enableCursor);
  });

  enableCursor();
}
