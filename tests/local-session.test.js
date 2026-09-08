import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalSession } from '../src/sessions/LocalSession.js';

test('embedded solo practice uses the registered Usion display name', () => {
  const session = new LocalSession('Altan Shagai');
  try {
    assert.equal(session.world.players.local.name, 'Altan Shagai');
    assert.equal(session.world.players.bot.name, 'Night Rival');
  } finally {
    session.stop();
  }
});

test('standalone practice keeps a neutral local fallback', () => {
  const session = new LocalSession('   ');
  try {
    assert.equal(session.world.players.local.name, 'You');
  } finally {
    session.stop();
  }
});

test('practice emits the final result once and stops advancing the simulation', () => {
  const session = new LocalSession();
  try {
    session.world.phase = 'finished';
    session.last = performance.now() - 50;
    let emitted = 0; session.onSnapshot(() => emitted++);
    session.frame(); const tick = session.world.snapshotTick;
    session.last = performance.now() - 100; session.frame();
    assert.equal(emitted, 1);
    assert.equal(session.world.snapshotTick, tick);
    assert.equal(session.finalEmitted, true);
  } finally { session.stop(); }
});
