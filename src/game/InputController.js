import { remapLandscapePointer } from '../ui/orientation.js';

const clamp = value => Math.max(-1, Math.min(1, value));

function bindStick(root, onMove, onRelease) {
  const knob = root.querySelector('i');
  const move = event => {
    const rect = root.getBoundingClientRect();
    const rawX = event.clientX - rect.left - rect.width / 2;
    const rawY = event.clientY - rect.top - rect.height / 2;
    const rotated = document.documentElement.classList.contains('landscape-fallback');
    const { x: dx, y: dy } = remapLandscapePointer(rawX, rawY, rotated);
    const radius = rect.width * 0.34;
    const distance = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / distance);
    const x = dx * scale;
    const y = dy * scale;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    onMove(clamp(x / radius), clamp(y / radius));
  };
  const release = event => {
    if (event && root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
    knob.style.transform = 'translate(0, 0)';
    onRelease();
  };
  root.addEventListener('pointerdown', event => {
    event.preventDefault(); root.setPointerCapture(event.pointerId); move(event);
  });
  root.addEventListener('pointermove', event => {
    if (root.hasPointerCapture(event.pointerId)) move(event);
  });
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('lostpointercapture', () => { knob.style.transform = 'translate(0, 0)'; onRelease(); });
  return release;
}

export class InputController {
  constructor(send) {
    this.send = send;
    this.state = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, attack: false, skill1: false, skill2: false };
    this.keys = new Set();
    this.seq = 0;
    this.enabled = false;
    this.releaseMove = bindStick(document.querySelector('#move-stick'), (x, y) => {
      this.state.moveX = x; this.state.moveY = y;
    }, () => { this.state.moveX = 0; this.state.moveY = 0; });
    this.releaseAim = bindStick(document.querySelector('#aim-stick'), (x, y) => {
      if (Math.hypot(x, y) > 0.12) { this.state.aimX = x; this.state.aimY = y; }
      this.state.attack = true;
    }, () => { this.state.attack = false; });
    this.bindSkill('#skill-1', 'skill1');
    this.bindSkill('#skill-2', 'skill2');
    this.bindKeyboard();
    this.timer = setInterval(() => this.flush(), 50);
  }

  bindSkill(selector, key) {
    const button = document.querySelector(selector);
    const release = () => { this.state[key] = false; };
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); this.state[key] = true; this.flush();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  bindKeyboard() {
    const update = () => {
      this.state.moveX = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0)
        - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
      this.state.moveY = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0)
        - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    };
    addEventListener('keydown', event => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      this.keys.add(event.code);
      if (event.code === 'Space') this.state.attack = true;
      if (event.code === 'KeyQ') this.state.skill1 = true;
      if (event.code === 'KeyE') this.state.skill2 = true;
      update();
    });
    addEventListener('keyup', event => {
      this.keys.delete(event.code);
      if (event.code === 'Space') this.state.attack = false;
      if (event.code === 'KeyQ') this.state.skill1 = false;
      if (event.code === 'KeyE') this.state.skill2 = false;
      update();
    });
    addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
  }

  pointAim(worldX, worldY, player) {
    if (!player || !Number.isFinite(worldX)) return;
    const dx = worldX - player.x;
    const dy = worldY - player.y;
    const length = Math.hypot(dx, dy) || 1;
    this.state.aimX = dx / length;
    this.state.aimY = dy / length;
  }

  setEnabled(enabled) {
    if (this.enabled && !enabled) {
      this.reset();
      this.seq += 1;
      this.send({ seq: this.seq, ...this.state });
    }
    this.enabled = enabled;
  }

  reset() {
    this.state.moveX = 0; this.state.moveY = 0; this.state.attack = false;
    this.state.skill1 = false; this.state.skill2 = false; this.keys.clear();
  }

  flush() {
    if (!this.enabled) return;
    this.seq += 1;
    this.send({ seq: this.seq, ...this.state });
  }
}
