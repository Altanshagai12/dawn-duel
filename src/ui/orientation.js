const PHONE_MAX_WIDTH = 760;

export function needsLandscapeFallback({ width, height, coarse = true }) {
  return coarse && width < height && width <= PHONE_MAX_WIDTH;
}

export function remapLandscapePointer(dx, dy, rotated) {
  return rotated ? { x: dy, y: -dx } : { x: dx, y: dy };
}

async function requestLandscapeLock(screenObject) {
  try {
    if (typeof screenObject?.orientation?.lock !== 'function') return false;
    await screenObject.orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}

export function installLandscapeMode({
  windowObject = window,
  documentObject = document,
  screenObject = screen,
} = {}) {
  const root = documentObject.documentElement;
  const measure = () => ({
    width: windowObject.visualViewport?.width || windowObject.innerWidth,
    height: windowObject.visualViewport?.height || windowObject.innerHeight,
    coarse: windowObject.matchMedia?.('(pointer: coarse)').matches ?? true,
  });
  const update = () => root.classList.toggle('landscape-fallback', needsLandscapeFallback(measure()));
  const retryNativeLock = () => { void requestLandscapeLock(screenObject).finally(update); };

  update();
  void requestLandscapeLock(screenObject).finally(update);
  windowObject.addEventListener('resize', update);
  windowObject.addEventListener('orientationchange', update);
  windowObject.visualViewport?.addEventListener('resize', update);
  documentObject.addEventListener('pointerdown', retryNativeLock, { once: true, capture: true });

  return () => {
    windowObject.removeEventListener('resize', update);
    windowObject.removeEventListener('orientationchange', update);
    windowObject.visualViewport?.removeEventListener('resize', update);
    documentObject.removeEventListener('pointerdown', retryNativeLock, { capture: true });
  };
}
