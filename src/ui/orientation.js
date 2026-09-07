export async function requestLandscapeLock(screenObject = screen) {
  try {
    if (typeof screenObject?.orientation?.lock !== 'function') return false;
    await screenObject.orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}

export function needsLandscapeGate(view = globalThis.window) {
  const width = Number(view?.visualViewport?.width || view?.innerWidth || 0);
  const height = Number(view?.visualViewport?.height || view?.innerHeight || 0);
  return width > 0 && height > 0 && width < height && width <= 760;
}

export function installLandscapeMode({
  documentObject = document,
  screenObject = screen,
  windowObject = window,
} = {}) {
  const retryNativeLock = () => { void requestLandscapeLock(screenObject); };
  const updateGate = () => {
    documentObject.documentElement?.classList.toggle('needs-landscape', needsLandscapeGate(windowObject));
  };

  void requestLandscapeLock(screenObject);
  documentObject.addEventListener('pointerdown', retryNativeLock, { once: true, capture: true });
  windowObject.addEventListener('resize', updateGate, { passive: true });
  windowObject.addEventListener('orientationchange', updateGate, { passive: true });
  windowObject.visualViewport?.addEventListener('resize', updateGate, { passive: true });
  updateGate();

  return () => {
    documentObject.removeEventListener('pointerdown', retryNativeLock, { capture: true });
    windowObject.removeEventListener('resize', updateGate);
    windowObject.removeEventListener('orientationchange', updateGate);
    windowObject.visualViewport?.removeEventListener('resize', updateGate);
  };
}
