import assert from 'node:assert/strict';
import test from 'node:test';

function fakeObject(counter) {
  counter.objects += 1;
  return {
    visible: true,
    setAlpha() { return this; }, setBlendMode() { return this; }, setDepth() { return this; },
    setDisplaySize() { return this; }, setPosition() { return this; }, setRotation() { return this; },
    setTint() { return this; },
    setVisible(value) { this.visible = value; return this; },
  };
}

function fakeGraphics(counter) {
  const value = fakeObject(counter);
  for (const method of ['clear', 'fillCircle', 'fillStyle', 'lineBetween', 'lineStyle', 'strokeCircle']) {
    value[method] = () => { counter[method] = (counter[method] || 0) + 1; return value; };
  }
  return value;
}

test('hitscan pool allocates once, stays bounded across 100 shots, and resets', async t => {
  const previous = { Phaser: globalThis.Phaser, matchMedia: globalThis.matchMedia };
  t.after(() => Object.assign(globalThis, previous));
  globalThis.Phaser = { BlendModes: { ADD: 'add' } };
  globalThis.matchMedia = () => ({ matches: false });
  const { ShotEffects } = await import('../src/game/ShotEffects.js');
  const counter = { objects: 0, shakes: 0 };
  const make = () => fakeObject(counter);
  const scene = { add: { graphics: () => fakeGraphics(counter), image: make },
    cameras: { main: { shake: () => { counter.shakes += 1; } } } };
  const effects = new ShotEffects(scene);
  const allocated = counter.objects;
  assert.equal(allocated, 24 + 2, '24 reusable bolts share two Graphics layers');
  for (let index = 0; index < 100; index += 1) {
    effects.show({ kind: index % 9 ? 'minionShot' : 'structureShot', x: 0, y: 72, tx: 20, ty: 20 }, 1, 0xffffff, { x: 20, y: 20 });
  }
  assert.equal(counter.objects, allocated, 'combat bursts must not allocate new render objects');
  effects.update(1.15);
  effects.update(1.31);
  assert.equal(effects.pool.every(slot => !slot.active), true);
  effects.show({ kind: 'structureShot', x: 0, y: 72, tx: 20, ty: 20 }, 2, 0xffffff, { x: 20, y: 20 });
  assert.equal(counter.shakes > 0, true, 'nearby tower hits retain camera feedback');
  effects.reset();
  assert.equal(effects.pool.every(slot => !slot.active && !slot.bolt.visible), true);
});

test('reduced motion keeps the authoritative beam and impact but removes sparks and shake', async t => {
  const previous = { Phaser: globalThis.Phaser, matchMedia: globalThis.matchMedia };
  t.after(() => Object.assign(globalThis, previous));
  globalThis.Phaser = { BlendModes: { ADD: 'add' } };
  globalThis.matchMedia = () => ({ matches: true });
  const { ShotEffects } = await import(`../src/game/ShotEffects.js?reduced=${Date.now()}`);
  const counter = { objects: 0, shakes: 0 };
  const make = () => fakeObject(counter);
  const scene = { add: { graphics: () => fakeGraphics(counter), image: make },
    cameras: { main: { shake: () => { counter.shakes += 1; } } } };
  const effects = new ShotEffects(scene, 1);
  effects.show({ kind: 'structureShot', x: 0, y: 72, tx: 20, ty: 20 }, 1, 0xffffff, { x: 20, y: 20 });
  effects.update(1);
  assert.equal(effects.pool[0].bolt.visible, true);
  assert.equal(effects.pool[0].sparkCount, 0);
  assert.ok(counter.lineBetween > 0 && counter.fillCircle > 0 && counter.strokeCircle > 0,
    'reduced motion retains readable beam, flash and impact ring');
  assert.equal(counter.shakes, 0);
});

test('a shot expires on monotonic presentation time during snapshot silence', async t => {
  const previous = { Phaser: globalThis.Phaser, matchMedia: globalThis.matchMedia };
  t.after(() => Object.assign(globalThis, previous));
  globalThis.Phaser = { BlendModes: { ADD: 'add' } };
  globalThis.matchMedia = () => ({ matches: false });
  const { ShotEffects } = await import('../src/game/ShotEffects.js');
  const counter = { objects: 0, shakes: 0 };
  const make = () => fakeObject(counter);
  const scene = { add: { graphics: () => fakeGraphics(counter), image: make },
    cameras: { main: { shake() {} } } };
  const effects = new ShotEffects(scene, 1);
  effects.show({ kind: 'minionShot', x: 0, y: 12, tx: 20, ty: 20 }, 42, 0xffffff, null);
  effects.update(42.299);
  assert.equal(effects.pool[0].active, true);
  effects.update(42.301); // No intervening authoritative snapshot/show call.
  assert.equal(effects.pool[0].active, false);
  assert.equal(effects.pool[0].bolt.visible, false);
});
