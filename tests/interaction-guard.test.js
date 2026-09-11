import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installGameInteractionGuard } from '../src/ui/interaction-guard.js';

test('game surface disables native WebKit selection, callouts and image dragging before boot', () => {
  const css = readFileSync(new URL('../styles/base.css', import.meta.url), 'utf8');
  assert.match(css, /-webkit-user-select:\s*none/);
  assert.match(css, /-webkit-touch-callout:\s*none/);
  assert.match(css, /-webkit-user-drag:\s*none/);
  assert.match(css, /html, body, #app, #app \*\s*\{[^}]*user-select:\s*none/);
  assert.match(css, /\.select-panel\s*\{[^}]*overflow-y:\s*auto;\s*touch-action:\s*pan-y/);
  assert.match(css, /button:focus-visible\s*\{[^}]*outline:/);
});

const dispatch = (root, type, props = {}) => {
  const event = Object.assign(new Event(type, { cancelable: true }), props);
  root.dispatchEvent(event); return event;
};

test('native selection, drag, callout and Safari gestures are cancelled without stopping delivery', () => {
  const doc = new EventTarget(); installGameInteractionGuard(doc);
  for (const type of ['contextmenu', 'selectstart', 'dragstart', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend']) {
    let observed = false; doc.addEventListener(type, () => { observed = true; }, { once: true });
    assert.equal(dispatch(doc, type).defaultPrevented, true, type);
    assert.equal(observed, true, 'guard must not stop propagation to game handlers');
  }
});

test('pinch/trackpad zoom is cancelled but one-finger panel scrolling and ordinary wheels remain native', () => {
  const doc = new EventTarget(); installGameInteractionGuard(doc);
  assert.equal(dispatch(doc, 'touchmove', { touches: [{}, {}] }).defaultPrevented, true);
  assert.equal(dispatch(doc, 'touchmove', { touches: [{}] }).defaultPrevented, false);
  assert.equal(dispatch(doc, 'wheel', { ctrlKey: true }).defaultPrevented, true);
  assert.equal(dispatch(doc, 'wheel', { metaKey: true }).defaultPrevented, true);
  assert.equal(dispatch(doc, 'wheel').defaultPrevented, false);
});

test('normal taps, two-thumb pointer lifecycles, clicks and native selector changes are untouched', () => {
  const doc = new EventTarget(); installGameInteractionGuard(doc);
  for (const type of ['touchstart', 'touchend', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'click', 'change']) {
    for (const pointerId of [1, 2]) {
      assert.equal(dispatch(doc, type, { pointerId, touches: [{}, {}] }).defaultPrevented, false, type);
    }
  }
});

test('selection/zoom shortcuts are guarded without disabling focus, game keys or zoom reset', () => {
  const doc = new EventTarget(); installGameInteractionGuard(doc);
  for (const modifier of ['ctrlKey', 'metaKey']) {
    for (const key of ['a', 'A', '+', '=', '-']) {
      assert.equal(dispatch(doc, 'keydown', { key, [modifier]: true }).defaultPrevented, true);
    }
    assert.equal(dispatch(doc, 'keydown', { key: '0', [modifier]: true }).defaultPrevented, false);
  }
  for (const key of ['Tab', 'Enter', ' ', 'q', 'e', 'a', 'ArrowDown', 'Escape']) {
    assert.equal(dispatch(doc, 'keydown', { key }).defaultPrevented, false);
  }
  assert.equal(dispatch(doc, 'keydown', { key: '+', ctrlKey: true, altKey: true }).defaultPrevented, false);
});

test('installation is idempotent, non-passive and fully disposable', () => {
  const doc = new EventTarget(); const registrations = [];
  const add = doc.addEventListener.bind(doc);
  doc.addEventListener = (type, fn, options) => { registrations.push({ type, options }); add(type, fn, options); };
  const dispose = installGameInteractionGuard(doc);
  assert.equal(installGameInteractionGuard(doc), dispose); assert.equal(registrations.length, 10);
  assert.ok(registrations.every(({ options }) => options.capture && options.passive === false));
  dispose(); dispose();
  assert.equal(dispatch(doc, 'selectstart').defaultPrevented, false);
  const again = installGameInteractionGuard(doc);
  dispose(); // An old teardown cannot remove the new installation.
  assert.equal(dispatch(doc, 'selectstart').defaultPrevented, true); again();
});

test('guard installs before session/UI/input startup, with first-paint viewport and fresh CSS URL', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.indexOf('installGameInteractionGuard();') < main.indexOf('new PlatformSession'));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /minimum-scale=1,maximum-scale=1/);
  assert.match(html, /styles\/base\.css\?v=9/);
});
