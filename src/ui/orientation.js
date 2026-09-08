export async function requestLandscapeLock(screenObject = screen) {
  try {
    if (typeof screenObject?.orientation?.lock !== 'function') return false;
    await screenObject.orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}

export function installLandscapeMode({
  documentObject = document,
  screenObject = screen,
} = {}) {
  const retryNativeLock = () => { void requestLandscapeLock(screenObject); };

  void requestLandscapeLock(screenObject);
  documentObject.addEventListener('pointerdown', retryNativeLock, { once: true, capture: true });

  return () => {
    documentObject.removeEventListener('pointerdown', retryNativeLock, { capture: true });
  };
}
// Must match viewport.css. The entire root rotates, never the camera alone.
export function isGameRotated() {
  return globalThis.matchMedia?.('(orientation: portrait)').matches === true;
}

export function gameVectorFromClient({ x, y }, rotated = isGameRotated()) {
  return rotated ? { x: y, y: -x } : { x, y };
}

export function surfacePointFromClient(point, surface, rotated = isGameRotated()) {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return rotated ? {
    x: (point.clientY - rect.top) * surface.width / rect.height,
    y: (rect.left + rect.width - point.clientX) * surface.height / rect.width,
  } : {
    x: (point.clientX - rect.left) * surface.width / rect.width,
    y: (point.clientY - rect.top) * surface.height / rect.height,
  };
}
