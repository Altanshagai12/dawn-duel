import { updateBot } from '../../server/bot.js';
import { filterSnapshot } from '../../server/fog.js';
import { applyCommand } from '../../server/inputs.js';
import { stepWorld } from '../../server/sim.js';
import { addPlayer, createWorld } from '../../server/world.js';
import { isChoice } from './ChoiceTransport.js';

export class LocalSession {
  constructor(playerName = 'You') {
    this.mode = 'solo';
    this.world = createWorld((Date.now() ^ 0xdaa7) >>> 0);
    const displayName = typeof playerName === 'string' && playerName.trim() ? playerName : 'You';
    addPlayer(this.world, 'local', displayName);
    addPlayer(this.world, 'bot', 'Night Rival');
    applyCommand(this.world, 'bot', 'select_hero', { hero: 'scarlett' });
    this.world.players.bot.ready = true;
    this.botMemory = {};
    this.listeners = new Set();
    this.last = performance.now();
    this.accumulator = 0;
    this.timer = setInterval(() => this.frame(), 16);
  }

  onSnapshot(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  frame() {
    const now = performance.now();
    if (globalThis.document?.hidden) { this.last = now; return; }
    if (this.world.phase === 'finished' && this.finalEmitted) return;
    this.accumulator += Math.min(100, now - this.last) / 1000;
    this.last = now;
    while (this.accumulator >= 1 / 30) {
      if (this.world.phase === 'playing' && this.world.snapshotTick % 3 === 0) {
        this.botMemory = updateBot(this.world, 'bot', this.botMemory);
      }
      stepWorld(this.world, 1 / 30);
      this.accumulator -= 1 / 30;
      if (this.world.snapshotTick % 2 === 0 || this.world.phase !== 'playing') this.emit();
      if (this.world.phase === 'finished') { this.finalEmitted = true; clearInterval(this.timer); break; }
    }
  }

  emit() {
    const snapshot = filterSnapshot(this.world, 'local');
    snapshot.sequence = this.snapshotSequence = (this.snapshotSequence || 0) + 1;
    for (const listener of this.listeners) listener(snapshot);
  }

  command(type, data = {}) {
    const applied = applyCommand(this.world, 'local', type, data);
    if (isChoice(type)) {
      this.emit();
      const receipt = this.world.players.local.choiceReceipts?.find(item => item.requestId === data.requestId);
      return applied && receipt ? Promise.resolve(receipt)
        : Promise.reject(Object.assign(new Error(receipt?.reason || 'INVALID_CHOICE'), { code: receipt?.reason || 'INVALID_CHOICE' }));
    }
    if (type === 'select_hero' && applied) {
      this.world.players.bot.ready = true;
      applyCommand(this.world, 'local', 'start_match');
    }
    return applied;
  }
  sendInput(data) { return this.command('input', data); }
  stop() { clearInterval(this.timer); this.listeners.clear(); }
}
