import { MAP } from '../../server/config.js';

// Fog is a flat, soft-edged mask. Rendering it at half world resolution cuts
// its backing texture to one quarter of the pixels without changing gameplay.
export const FOG_TEXTURE_SCALE = 0.5;

export class FogView {
  constructor(scene) {
    this.scene = scene;
    this.width = Math.ceil(MAP.width * FOG_TEXTURE_SCALE);
    this.height = Math.ceil(MAP.height * FOG_TEXTURE_SCALE);
    this.cover = scene.make.graphics({ add: false });
    this.holes = scene.make.graphics({ add: false });
    this.cover.fillStyle(0x01060b, 0.74).fillRect(0, 0, this.width, this.height);
    this.texture = scene.add.renderTexture(0, 0, this.width, this.height)
      .setOrigin(0).setDisplaySize(MAP.width, MAP.height).setDepth(FOG_DEPTH);
    this.previous = [];
    this.hasDrawn = false;
  }

  draw(sources = []) {
    const size = sources.length * 3;
    let changed = !this.hasDrawn || this.previous.length !== size;
    for (let index = 0; index < sources.length && !changed; index += 1) {
      const source = sources[index], offset = index * 3;
      changed = this.previous[offset] !== source.x || this.previous[offset + 1] !== source.y
        || this.previous[offset + 2] !== source.radius;
    }
    if (!changed) return false;
    this.previous.length = size;
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index], offset = index * 3;
      this.previous[offset] = source.x;
      this.previous[offset + 1] = source.y;
      this.previous[offset + 2] = source.radius;
    }
    this.hasDrawn = true;
    this.holes.clear().fillStyle(0xffffff, 1);
    for (const source of sources) {
      this.holes.fillCircle(
        source.x * FOG_TEXTURE_SCALE,
        source.y * FOG_TEXTURE_SCALE,
        source.radius * FOG_TEXTURE_SCALE,
      );
    }
    this.texture.clear();
    this.texture.draw(this.cover);
    this.texture.erase(this.holes);
    return true;
  }
}

// All y-sorted entities and fixed-depth combat effects must remain below fog.
export const FOG_DEPTH = MAP.height + 2000;
