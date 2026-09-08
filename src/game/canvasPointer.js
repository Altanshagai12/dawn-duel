import { surfacePointFromClient } from '../ui/orientation.js';

// Phaser's default pointer normalization cannot invert a rotated DOM ancestor.
export function bindCanvasPointer(canvas, camera, bridge, windowObject = window) {
  let pointerId = null;
  const aim = event => {
    if (event.pointerType !== 'mouse') return;
    const point = surfacePointFromClient(event, canvas);
    if (!point) return;
    const world = camera.getWorldPoint(point.x, point.y);
    bridge.aim(world.x, world.y);
  };
  const down = event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    canvas.setPointerCapture?.(pointerId);
    aim(event); bridge.attack(true);
  };
  const release = event => {
    if (event?.pointerId != null && event.pointerId !== pointerId) return;
    const captured = pointerId; pointerId = null;
    if (captured !== null && canvas.hasPointerCapture?.(captured)) canvas.releasePointerCapture(captured);
    bridge.attack(false);
  };
  const bindings = [
    [canvas, 'pointermove', aim], [canvas, 'pointerdown', down],
    [canvas, 'lostpointercapture', release],
    ...['pointerup', 'pointercancel', 'blur', 'resize', 'orientationchange'].map(type => [windowObject, type, release]),
  ];
  for (const [target, type, handler] of bindings) target.addEventListener(type, handler);
  return () => {
    release();
    for (const [target, type, handler] of bindings) target.removeEventListener(type, handler);
  };
}
