import { gameVectorFromClient } from '../ui/orientation.js';
import { INPUT_TIMELINE, InputTimeline } from './inputTimeline.js';

const clamp = value => Math.max(-1, Math.min(1, value));
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyQ', 'KeyE']);

function bindStick(root, enabled, onMove, onRelease, onEdge) {
  const knob = root.querySelector('i');
  let pointer = null;
  const move = event => {
    const rect = root.getBoundingClientRect();
    const { x: dx, y: dy } = gameVectorFromClient({
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    });
    const radius = rect.width * .34;
    const scale = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    onMove(clamp(dx * scale / radius), clamp(dy * scale / radius));
  };
  const release = event => {
    if (event && event.pointerId !== pointer) return;
    const captured = pointer; pointer = null;
    if (captured !== null && root.hasPointerCapture?.(captured)) root.releasePointerCapture(captured);
    knob.style.transform = 'translate(0, 0)'; onRelease();
    if (captured !== null) onEdge();
  };
  root.addEventListener('pointerdown', event => {
    if (!enabled() || pointer !== null) return;
    event.preventDefault(); pointer = event.pointerId;
    root.setPointerCapture(pointer); move(event);
    onEdge();
  });
  root.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, release);
  return release;
}

export class InputController {
  constructor(send, clock) {
    this.send = send;
    this.state = {
      moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false, attackMode: 'auto',
      targetPriority: 'nearest', attackPress: 0, attackPressMode: 'auto',
      skill1: false, skill2: false, skill1Press: 0, skill2Press: 0, skill1Auto: true, skill2Auto: true,
    };
    this.timeline = new InputTimeline(clock);
    Object.defineProperty(this.state, INPUT_TIMELINE, { value: this.timeline });
    this.attackSources = new Map();
    this.keys = new Set(); this.seq = 0; this.enabled = false; this.preview = null;
    this.releaseMove = bindStick(document.querySelector('#move-stick'), () => this.enabled, (x, y) => {
      this.state.moveX = x; this.state.moveY = y;
    }, () => { this.state.moveX = 0; this.state.moveY = 0; }, () => this.flush());
    this.attackButtons = [
      ['#aim-stick', 'auto'], ['#attack-farm', 'farm'], ['#attack-structure', 'structure'],
    ].map(([selector, mode]) => ({ root: document.querySelector(selector), mode }));
    this.releaseAttacks = this.attackButtons.map(({ root, mode }) => this.bindAttack(root, mode));
    document.querySelector('#target-priority')?.addEventListener('change', event => {
      const priority = event.target.value;
      if (!['nearest', 'lowestHp', 'lowestRatio'].includes(priority)) return;
      this.state.targetPriority = priority; this.flush();
    });
    this.cancelSkills = [this.bindSkill('#skill-1', 0), this.bindSkill('#skill-2', 1)];
    this.bindKeyboard(); this.timer = setInterval(() => this.flush(), 50);
  }

  bindAttack(button, mode) {
    if (!button) return () => {};
    let pointer = null;
    const source = `button:${mode}`;
    const release = event => {
      if (event && event.pointerId !== pointer) return;
      const captured = pointer; pointer = null;
      if (captured !== null && button.hasPointerCapture?.(captured)) button.releasePointerCapture(captured);
      this.setAttack(false, source);
    };
    button.addEventListener('pointerdown', event => {
      if (!this.enabled || button.disabled || pointer !== null) return;
      event.preventDefault(); pointer = event.pointerId;
      button.setPointerCapture?.(pointer); this.setAttack(true, source, true, mode);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
    button.addEventListener('click', event => {
      if (event.detail !== 0 || !this.enabled || button.disabled) return;
      this.setAttack(true, `accessible:${mode}`, true, mode);
      this.setAttack(false, `accessible:${mode}`);
    });
    return release;
  }

  bindSkill(selector, index) {
    const button = document.querySelector(selector);
    let gesture = null;
    const cancel = () => {
      const pointer = gesture?.pointer; gesture = null; this.preview = null;
      if (pointer != null && button.hasPointerCapture(pointer)) button.releasePointerCapture(pointer);
      button.classList.remove('is-aiming', 'is-cancelling');
    };
    button.addEventListener('pointerdown', event => {
      if (!this.enabled || button.disabled || gesture || this.preview) return;
      event.preventDefault();
      gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, cancel: false, manual: false };
      button.setPointerCapture(event.pointerId); button.classList.add('is-aiming');
      this.preview = { index, auto: true, aimX: this.state.aimX, aimY: this.state.aimY, cancelled: false };
    });
    button.addEventListener('pointermove', event => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      const { x: dx, y: dy } = gameVectorFromClient({ x: event.clientX - gesture.x, y: event.clientY - gesture.y });
      const length = Math.hypot(dx, dy);
      gesture.cancel = length > 150;
      if (length > 12) { gesture.manual = true; this.state.aimX = dx / length; this.state.aimY = dy / length; }
      this.preview = { index, auto: !gesture.manual, aimX: this.state.aimX, aimY: this.state.aimY, cancelled: gesture.cancel };
      button.classList.toggle('is-cancelling', gesture.cancel);
    });
    button.addEventListener('pointerup', event => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      const cast = !gesture.cancel && this.enabled && !button.disabled;
      const auto = !gesture.manual; cancel();
      if (cast) this.pressSkill(index, auto);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, event => {
      if (event.pointerId === gesture?.pointer) cancel();
    });
    button.addEventListener('click', event => {
      if (event.detail === 0 && this.enabled && !button.disabled) this.pressSkill(index);
    });
    return cancel;
  }

  pressSkill(index, auto = true) {
    const key = index === 0 ? 'skill1' : 'skill2';
    this.state[`${key}Press`] += 1;
    this.state[`${key}Auto`] = auto;
    this.state[key] = true; this.flush();
    this.state[key] = false; this.flush();
  }

  bindKeyboard() {
    const update = () => {
      this.state.moveX = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
      this.state.moveY = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    };
    addEventListener('keydown', event => {
      if (!this.enabled || !GAME_KEYS.has(event.code) || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)
        || (event.target?.tagName === 'BUTTON' && event.code === 'Space')) return;
      event.preventDefault();
      if (this.keys.has(event.code)) return;
      this.keys.add(event.code);
      if (event.code === 'Space') this.setAttack(true, 'keyboard', false);
      if (event.code === 'KeyQ' || event.code === 'KeyE') this.pressSkill(event.code === 'KeyQ' ? 0 : 1);
      update();
      if (event.code !== 'KeyQ' && event.code !== 'KeyE') this.flush();
    });
    addEventListener('keyup', event => {
      if (!GAME_KEYS.has(event.code)) return;
      if (this.enabled) event.preventDefault();
      this.keys.delete(event.code);
      if (event.code === 'Space') this.setAttack(false, 'keyboard', false);
      update();
      this.flush();
    });
    addEventListener('blur', () => { this.reset(); this.flush(); });
    for (const type of ['resize', 'orientationchange']) {
      addEventListener(type, () => { this.reset(); this.flush(); }, { passive: true });
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.reset(); this.flush(); } });
  }

  pointAim(worldX, worldY, player) {
    if (!this.enabled || !player || !Number.isFinite(worldX) || !Number.isFinite(worldY)) return;
    const dx = worldX - player.x, dy = worldY - player.y;
    const length = Math.hypot(dx, dy) || 1;
    this.state.aimX = dx / length; this.state.aimY = dy / length;
  }

  setAttack(active, source = 'pointer', immediate = true, mode = 'auto') {
    const pressed = this.enabled && active && !this.attackSources.has(source);
    if (this.enabled && active) this.attackSources.set(source, mode);
    else this.attackSources.delete(source);
    const attack = this.enabled && this.attackSources.size > 0;
    const nextMode = [...this.attackSources.values()].at(-1) || this.state.attackMode;
    const changed = attack !== this.state.attack || nextMode !== this.state.attackMode || pressed;
    if (pressed) { this.state.attackPress += 1; this.state.attackPressMode = mode; }
    this.state.attack = attack;
    this.state.attackMode = nextMode;
    for (const button of this.attackButtons) {
      button.root?.classList.toggle('is-held', attack && button.mode === nextMode);
      button.root?.setAttribute?.('aria-pressed', String(attack && button.mode === nextMode));
    }
    if (changed && immediate) this.flush();
  }

  setEnabled(enabled) {
    if (this.enabled && !enabled) { this.reset(); this.flush(); }
    this.enabled = Boolean(enabled);
  }

  reconcile(player) {
    for (const key of ['attackPress', 'skill1Press', 'skill2Press']) this.state[key] = Math.max(this.state[key], player?.[key] || 0);
    if (Number.isSafeInteger(player?.inputSeq)) this.timeline.acknowledge(player.inputSeq);
  }

  resetSession() {
    this.reset(); this.state.attackPress = 0; this.state.skill1Press = 0; this.state.skill2Press = 0;
    this.state.attackMode = 'auto'; this.state.attackPressMode = 'auto';
    this.seq = 0; this.timeline.reset();
  }

  reset() {
    this.attackSources.clear(); this.state.attack = false;
    this.releaseMove(); this.releaseAttacks.forEach(release => release()); this.cancelSkills.forEach(cancel => cancel());
    this.state.skill1 = false; this.state.skill2 = false; this.keys.clear();
  }

  flush() {
    if (!this.enabled) return;
    this.seq += 1;
    const packet = { seq: this.seq, ...this.state };
    this.timeline.record(packet);
    this.send(packet);
  }
}
