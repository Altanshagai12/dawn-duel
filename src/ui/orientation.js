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
