import { MAP } from '../../server/config.js';

function colorOf(site) {
  return Number.parseInt(String(site.color || '#ffffff').slice(1), 16);
}

export class ObjectiveViews {
  constructor(scene) {
    this.scene = scene;
    this.buffSites = new Map();
    for (const site of MAP.buffSites) this.createBuffSite(site);
  }

  createBuffSite(site) {
    const color = colorOf(site);
    const root = this.scene.add.container(site.x, site.y).setDepth(-4);
    const halo = this.scene.add.circle(0, 0, MAP.buffPocketRadius, color, .045)
      .setStrokeStyle(4, color, .52);
    const core = this.scene.add.circle(0, 0, 31, color, .16)
      .setStrokeStyle(3, 0xffffff, .72).setBlendMode(Phaser.BlendModes.ADD);
    const label = this.scene.add.text(0, -66, 'BUFF', {
      fontFamily: 'system-ui', fontSize: '12px', fontStyle: 'bold', color: '#effff8',
      stroke: '#061010', strokeThickness: 4,
    }).setOrigin(.5);
    const meterBg = this.scene.add.rectangle(0, 65, 76, 6, 0x020707, .82);
    const meter = this.scene.add.rectangle(-38, 65, 76, 4, color, 1).setOrigin(0, .5);
    root.add([halo, core, label, meterBg, meter]);
    this.scene.tweens.add({ targets: [halo, core], alpha: .24, scale: 1.06, duration: 1000, yoyo: true, repeat: -1 });
    this.buffSites.set(site.id, { root, halo, core, label, meterBg, meter });
  }

  apply(sites = [], now = 0) {
    for (const site of sites) {
      const view = this.buffSites.get(site.id);
      if (!view) continue;
      if (site.visible === false) {
        view.root.setVisible(false);
        continue;
      }
      view.root.setVisible(true);
      const ready = Boolean(site.available);
      view.root.setAlpha(ready ? 1 : .38);
      view.label.setText(ready ? 'BUFF' : `${Math.max(0, Math.ceil(site.spawnAt - now))}s`);
      view.meterBg.setVisible(ready && site.captureProgress > 0);
      view.meter.setVisible(ready && site.captureProgress > 0).setScale(site.captureProgress || 0, 1);
    }
  }
}
