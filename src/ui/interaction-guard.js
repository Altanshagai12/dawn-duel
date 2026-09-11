const installed = new WeakMap();

// This document is the game iframe, never the Usion host or browser chrome.
// Cancel browser defaults, not input propagation: controls own PointerEvents,
// and hero/upgrade buttons must still receive their native click.
export function installGameInteractionGuard(documentObject = document) {
  if (installed.has(documentObject)) return installed.get(documentObject);
  const options = { capture: true, passive: false };
  const listeners = [];
  const prevent = event => { if (event.cancelable) event.preventDefault(); };
  const on = (type, handler) => {
    documentObject.addEventListener(type, handler, options);
    listeners.push([type, handler]);
  };
  for (const type of ['contextmenu', 'selectstart', 'dragstart', 'dblclick',
    'gesturestart', 'gesturechange', 'gestureend']) on(type, prevent);
  on('touchmove', event => { if (event.touches?.length > 1) prevent(event); });
  on('wheel', event => { if (event.ctrlKey || event.metaKey) prevent(event); });
  on('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.target?.closest?.('input, textarea, [contenteditable=""], [contenteditable="true"]')) return;
    if (['a', '+', '=', '-'].includes(event.key?.toLowerCase())) prevent(event);
    // Keep Ctrl/Cmd+0 available to reset a pre-existing browser zoom level.
  });
  const dispose = () => {
    if (installed.get(documentObject) !== dispose) return;
    for (const [type, handler] of listeners) documentObject.removeEventListener(type, handler, options);
    installed.delete(documentObject);
  };
  installed.set(documentObject, dispose);
  return dispose;
}
