const clamp = value => Math.max(-1, Math.min(1, value));
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyQ', 'KeyE']);

function bindStick(root, enabled, onMove, onRelease) {
  const knob = root.querySelector('i');
  let pointer = null;
  const move = event => {
    const rect = root.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
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
  };
  root.addEventListener('pointerdown', event => {
    if (!enabled() || pointer !== null) return;
    event.preventDefault(); pointer = event.pointerId;
    root.setPointerCapture(pointer); move(event);
  });
  root.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, release);
  return release;
}

export class InputController {
  constructor(send) {
    this.send = send;
    this.state = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false, skill1: false, skill2: false, skill1Press: 0, skill2Press: 0 };
    this.keys = new Set(); this.seq = 0; this.enabled = false; this.preview = null;
    this.releaseMove = bindStick(document.querySelector('#move-stick'), () => this.enabled, (x, y) => {
      this.state.moveX = x; this.state.moveY = y;
    }, () => { this.state.moveX = 0; this.state.moveY = 0; });
    this.releaseAim = bindStick(document.querySelector('#aim-stick'), () => this.enabled, (x, y) => {
      if (Math.hypot(x, y) > .12) { this.state.aimX = x; this.state.aimY = y; }
      this.state.attack = true;
    }, () => { this.state.attack = false; });
    this.cancelSkills = [this.bindSkill('#skill-1', 0), this.bindSkill('#skill-2', 1)];
    this.bindKeyboard(); this.timer = setInterval(() => this.flush(), 50);
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
      gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, cancel: false };
      button.setPointerCapture(event.pointerId); button.classList.add('is-aiming');
      this.preview = { index, aimX: this.state.aimX, aimY: this.state.aimY, cancelled: false };
    });
    button.addEventListener('pointermove', event => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      const length = Math.hypot(dx, dy);
      gesture.cancel = length > 150;
      if (length > 9) { this.state.aimX = dx / length; this.state.aimY = dy / length; }
      this.preview = { index, aimX: this.state.aimX, aimY: this.state.aimY, cancelled: gesture.cancel };
      button.classList.toggle('is-cancelling', gesture.cancel);
    });
    button.addEventListener('pointerup', event => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      const cast = !gesture.cancel && this.enabled && !button.disabled; cancel();
      if (cast) this.pressSkill(index);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, cancel);
    return cancel;
  }

  pressSkill(index) {
    const key = index === 0 ? 'skill1' : 'skill2';
    this.state[`${key}Press`] += 1;
    this.state[key] = true; this.flush();
    this.state[key] = false; this.flush();
  }

  bindKeyboard() {
    const update = () => {
      this.state.moveX = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
      this.state.moveY = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    };
    addEventListener('keydown', event => {
      if (!this.enabled || !GAME_KEYS.has(event.code) || ['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      event.preventDefault();
      if (this.keys.has(event.code)) return;
      this.keys.add(event.code);
      if (event.code === 'Space') this.state.attack = true;
      if (event.code === 'KeyQ' || event.code === 'KeyE') this.pressSkill(event.code === 'KeyQ' ? 0 : 1);
      update();
    });
    addEventListener('keyup', event => {
      if (!GAME_KEYS.has(event.code)) return;
      if (this.enabled) event.preventDefault();
      this.keys.delete(event.code);
      if (event.code === 'Space') this.state.attack = false;
      update();
    });
    addEventListener('blur', () => { this.reset(); this.flush(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.reset(); this.flush(); } });
  }

  pointAim(worldX, worldY, player) {
    if (!this.enabled || !player || !Number.isFinite(worldX) || !Number.isFinite(worldY)) return;
    const dx = worldX - player.x, dy = worldY - player.y;
    const length = Math.hypot(dx, dy) || 1;
    this.state.aimX = dx / length; this.state.aimY = dy / length;
  }

  setEnabled(enabled) {
    if (this.enabled && !enabled) { this.reset(); this.flush(); }
    this.enabled = Boolean(enabled);
  }

  reconcile(player) {
    for (const key of ['skill1Press', 'skill2Press']) this.state[key] = Math.max(this.state[key], player?.[key] || 0);
  }

  resetSession() { this.reset(); this.state.skill1Press = 0; this.state.skill2Press = 0; }

  reset() {
    this.releaseMove(); this.releaseAim(); this.cancelSkills.forEach(cancel => cancel());
    this.state.skill1 = false; this.state.skill2 = false; this.keys.clear();
  }

  flush() {
    if (!this.enabled) return;
    this.seq += 1; this.send({ seq: this.seq, ...this.state });
  }
}
