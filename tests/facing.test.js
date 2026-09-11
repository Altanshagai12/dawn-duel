import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityViews } from '../src/game/EntityViews.js';
import { EntityMotion } from '../src/game/motion.js';
import { FacingState, heroAnimationFrame } from '../src/game/facing.js';
import { castSkill, prepareSkill, updateClones } from '../server/skills.js';
import { MAP } from '../server/config.js';
import { lanePoint } from '../server/geometry.js';
import { filterSnapshot } from '../server/fog.js';
import { playingWorld } from './helpers.js';

function fixture(input, entityChanges = {}) {
  const entity = { id: 'you', kind: 'player', hero: 'shana', team: 0, x: 900, y: 615,
    radius: 21, deaths: 0, ranks: {}, attackAt: -999, attackAimX: 0, attackAimY: 0, ...entityChanges };
  const root = { x: entity.x, y: entity.y, setDepth() {}, setAlpha() {} };
  const sprite = { setFrame(frame) { this.frame = frame; }, setFlipX(value) { this.flipX = value; } };
  const views = new EntityViews({}, () => input);
  views.localId = 'you'; views.playing = true; views.snapshotNow = 10; views.receivedMs = performance.now();
  const view = { entity, root, sprite, row: 4, motion: new EntityMotion(entity, 10000, performance.now()) };
  view.motion.snap = false;
  views.items.set(entity.id, view);
  return { views, view, input };
}

test('held attack without a target follows running direction and reversals', () => {
  for (const attackMode of ['auto', 'farm', 'structure']) {
    const { views, view, input } = fixture({ attack: true, attackMode, moveX: 1, moveY: 0 });
    views.update(0, 16); assert.equal(view.row, 2);
    input.moveX = -1;
    views.update(16, 16); assert.equal(view.row, 6);
  }
});

test('held attack during cooldown does not lock the previous shot direction', () => {
  const { views, view } = fixture({ attack: true, moveX: 0, moveY: -1 },
    { attackAt: 8, attackAimX: -1, attackAimY: 0, attackAngle: Math.PI });
  views.update(0, 16); assert.equal(view.row, 0);
});

function snapshot(entity, now = 10, extra = {}) {
  return { team: 0, you: 'you', now, match: { phase: 'playing' }, players: { [entity.id]: entity },
    minions: [], clones: [], camps: [], structures: {}, projectiles: [], effects: [], ...extra };
}

test('confirmed target direction wins unrelated joystick aim, then running resumes', () => {
  const { views, view } = fixture({ attack: true, moveX: 1, moveY: 0, aimX: 1, aimY: 0 },
    { attackAt: 10, attackAngle: Math.PI });
  views.apply(snapshot(view.entity)); views.update(0, 16);
  assert.equal(view.row, 6);
  view.facing.untilMs = performance.now() - 1;
  views.update(16, 16); assert.equal(view.row, 2);
});

test('correction-only drift never turns an idle local hero', () => {
  const { views, view } = fixture({});
  view.row = 0; view.motion.predicted.x += 5;
  views.update(0, 16);
  assert.ok(view.root.x > 900); assert.equal(view.row, 0);
});

test('remote and clone poses never borrow local controls', () => {
  for (const kind of ['player', 'clone']) {
    const { views, view } = fixture({ attack: true, moveX: 1, moveY: 0, aimX: 1, aimY: 0 },
      { id: 'rival', kind, attackAt: 10, attackAngle: -Math.PI / 2 });
    views.apply(snapshot(view.entity)); views.update(0, 16); assert.equal(view.row, 0);
    view.facing.untilMs = -1; views.update(16, 16); assert.equal(view.row, 0);
  }
});

test('all eight world directions resolve consistently for every hero and reset mirror on east', () => {
  for (const hero of ['shana', 'diamond', 'scarlett', 'hina']) {
    const facing = new FacingState();
    for (const row of [0, 1, 2, 3, 4, 5, 6, 7, 2]) {
      const angle = (row - 2) * Math.PI / 4;
      assert.equal(facing.update(Math.cos(angle), Math.sin(angle), 0), row);
      const mirrored = ['hina', 'scarlett'].includes(hero) && row > 4;
      for (let step = 0; step < 6; step += 1) {
        assert.deepEqual(heroAnimationFrame(hero, row, step * 110),
          { frame: (mirrored ? 8 - row : row) * 6 + step, flipX: mirrored });
      }
    }
  }
});

test('packet silence and repeated old acknowledgements cannot freeze a shot pose', () => {
  const facing = new FacingState();
  const shot = { attackAt: 10, attackAngle: Math.PI };
  facing.observeAttack(shot, 10, 1000);
  assert.equal(facing.update(1, 0, 1299), 6);
  facing.observeAttack(shot, 10, 1400);
  assert.equal(facing.update(1, 0, 1400), 2);
  facing.observeAttack({ attackAt: 9.9, attackAngle: -Math.PI / 2 }, 10, 1500);
  assert.equal(facing.update(0, 0, 1500), 2);
  facing.observeAttack({ attackAt: 10.1, attackAngle: -Math.PI / 2 }, 11, 1600);
  assert.equal(facing.update(0, 0, 1600), 2, 'late first delivery must also expire');
});

test('directional skills face their confirmed cast; utility skills preserve running', () => {
  for (const skillId of ['precision', 'volley', 'repulse', 'emberLine', 'moonSnare', 'aegis', 'cinderFocus']) {
    const facing = new FacingState();
    facing.observeSkill({ id: 'cast', skillId, castAt: 1, angle: Math.PI }, 1, 0);
    const directional = !['aegis', 'cinderFocus'].includes(skillId);
    assert.equal(facing.update(1, 0, 100), directional ? 6 : 2);
    facing.observeSkill({ id: 'cast', skillId, castAt: 1, angle: Math.PI }, 1, 400);
    assert.equal(facing.update(1, 0, 400), 2);
  }
});

test('newest action wins; a basic wins the same server tick as a skill in either arrival order', () => {
  for (const basicFirst of [true, false]) {
    const facing = new FacingState();
    const basic = () => facing.observeAttack({ attackAt: 1, attackAngle: 0 }, 1, 0);
    const skill = () => facing.observeSkill({ id: 'one', skillId: 'precision', castAt: 1, angle: Math.PI }, 1, 0);
    if (basicFirst) { basic(); skill(); } else { skill(); basic(); }
    assert.equal(facing.update(0, -1, 100), 2);
    facing.observeSkill({ id: 'two', skillId: 'precision', castAt: 1.1, angle: Math.PI }, 1.1, 100);
    assert.equal(facing.update(0, -1, 150), 6);
  }
});

test('v8 casts retain compatibility and Shadow Step uses real displacement instead of stale aim', () => {
  const facing = new FacingState();
  facing.observeSkill({ id: 'dash', skillId: 'shadowStep', expiresAt: 1.45, angle: 0,
    x: 20, y: 20, tx: 0, ty: 20 }, 1, 100);
  assert.equal(facing.update(1, 0, 200), 6);
  facing.observeSkill({ id: 'blocked', skillId: 'shadowStep', castAt: 2, angle: 0,
    x: 20, y: 20, tx: 20, ty: 20 }, 2, 1100);
  assert.equal(facing.update(0, -1, 1100), 0);
});

test('pause, death and new session reset do not replay a pre-death shot', () => {
  const facing = new FacingState();
  const shot = { attackAt: 10, attackAngle: Math.PI };
  facing.observeAttack(shot, 10, 0);
  assert.equal(facing.update(1, 0, 10, false), 4);
  assert.equal(facing.update(1, 0, 10, true, true), 2);
  facing.reset(shot); facing.observeAttack(shot, 10, 20);
  assert.equal(facing.update(0, -1, 30), 0);
  facing.reset(); facing.observeAttack({ attackAt: 1, attackAngle: Math.PI }, 1, 100);
  assert.equal(facing.update(1, 0, 110), 6);
});

test('invalid vectors and missing remote aim hold a finite previous frame', () => {
  const facing = new FacingState(7);
  for (const angle of [undefined, NaN, Infinity]) {
    facing.reset(); facing.observeAttack({ attackAt: 1, attackAngle: angle }, 1, 0);
    assert.equal(facing.update(NaN, undefined, 10), 7);
  }
});

test('real auto dash publishes its time/displacement and visible clone publishes its own shot heading', () => {
  const { world, blue, red } = playingWorld(['hina', 'shana']);
  Object.assign(blue, lanePoint(MAP.riverProgress));
  Object.assign(red, lanePoint(MAP.riverProgress - 100), { protectUntil: 0 });
  Object.assign(blue.input, { moveX: -MAP.laneUnitX, moveY: -MAP.laneUnitY });
  castSkill(world, prepareSkill(world, blue, 0, { auto: true, aimX: MAP.laneUnitX, aimY: MAP.laneUnitY }));
  const effect = world.effects.find(effect => effect.kind === 'skillCast');
  assert.equal(effect.castAt, world.matchTime);
  assert.ok((effect.tx - effect.x) * MAP.laneUnitX + (effect.ty - effect.y) * MAP.laneUnitY < 0);
  const facing = new FacingState(); facing.observeSkill(effect, world.matchTime, 0);
  assert.equal(facing.update(1, 0, 10), 5);
  const clone = world.clones[0]; world.matchTime = clone.nextShotAt;
  updateClones(world);
  assert.equal(clone.attackAt, world.matchTime);
  assert.equal(clone.attackAngle, Math.atan2(red.y - clone.y, red.x - clone.x));
  assert.equal(filterSnapshot(world, blue.id).clones[0].attackAngle, clone.attackAngle);
});
