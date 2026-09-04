export class FogView {
  constructor(scene) {
    this.scene = scene;
    this.cover = scene.make.graphics({ add: false });
    this.holes = scene.make.graphics({ add: false });
    this.texture = scene.add.renderTexture(0, 0, 2000, 900).setOrigin(0).setDepth(800);
  }

  draw(sources = []) {
    this.cover.clear().fillStyle(0x010707, 0.7).fillRect(0, 0, 2000, 900);
    this.holes.clear().fillStyle(0xffffff, 1);
    for (const source of sources) this.holes.fillCircle(source.x, source.y, source.radius);
    this.texture.clear();
    this.texture.draw(this.cover);
    this.texture.erase(this.holes);
  }
}
