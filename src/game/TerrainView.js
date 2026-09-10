import { MAP } from '../../server/config.js';
import { battlefieldRegions, lanePoint } from '../../server/geometry.js';
import { drawRegions } from '../ui/Minimap.js';

function clipRegions(ctx, regions) {
  ctx.beginPath();
  for (const r of regions) {
    if (r.kind === 'circle') {
      ctx.moveTo(r.x + r.radius, r.y); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    } else {
      const a = Math.atan2(r.end.y - r.start.y, r.end.x - r.start.x);
      const nx = Math.cos(a - Math.PI / 2) * r.radius, ny = Math.sin(a - Math.PI / 2) * r.radius;
      ctx.moveTo(r.start.x + nx, r.start.y + ny); ctx.lineTo(r.end.x + nx, r.end.y + ny);
      ctx.arc(r.end.x, r.end.y, r.radius, a - Math.PI / 2, a + Math.PI / 2);
      ctx.lineTo(r.start.x - nx, r.start.y - ny);
      ctx.arc(r.start.x, r.start.y, r.radius, a + Math.PI / 2, a + Math.PI * 1.5);
    }
    ctx.closePath();
  }
  ctx.clip();
}

function material(ctx, image, size) {
  const height = size * image.height / image.width;
  for (let y = 0; y < MAP.height; y += height) for (let x = 0; x < MAP.width; x += size) ctx.drawImage(image, x, y, size, height);
}

export function createTerrain(scene) {
  const texture = scene.textures.createCanvas('arena-terrain', MAP.width, MAP.height);
  const ctx = texture.context;
  const regions = battlefieldRegions();
  material(ctx, scene.textures.get('forest').getSourceImage(), 660);
  // Opaque walls around the union: internal corridor intersections stay open.
  for (const [padding, color] of [[20, '#14342b'], [13, '#465a46'], [7, '#a0aa82']]) {
    ctx.fillStyle = ctx.strokeStyle = color;
    drawRegions(ctx, regions, padding);
  }
  ctx.save(); clipRegions(ctx, regions);
  material(ctx, scene.textures.get('flagstone').getSourceImage(), 820);
  const lane = regions.filter(region => region.surface === 'lane');
  ctx.globalAlpha = .08; ctx.fillStyle = ctx.strokeStyle = '#dce1bd'; drawRegions(ctx, lane, -14); ctx.globalAlpha = 1;
  // Center crossing and team-facing lane markers communicate the single objective.
  for (let progress = 180; progress < MAP.laneLength - 100; progress += 125) {
    const p = lanePoint(progress), side = progress < MAP.riverProgress ? 0 : 1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(MAP.laneUnitY, MAP.laneUnitX) + (side ? Math.PI : 0));
    ctx.strokeStyle = side ? '#b1746e' : '#589e95'; ctx.lineWidth = 2; ctx.globalAlpha = .65;
    ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(5, 0); ctx.lineTo(-8, 11); ctx.stroke(); ctx.restore();
  }
  for (const [index, site] of MAP.campSites.entries()) {
    const glow = ctx.createRadialGradient(site.x, site.y, 15, site.x, site.y, 90);
    glow.addColorStop(0, index % 2 ? '#40acb333' : '#7948ac33'); glow.addColorStop(1, '#23372a00');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(site.x, site.y, 90, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = index % 2 ? '#467c83' : '#776080'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(site.x, site.y, 82, 0, Math.PI * 2); ctx.stroke();
    for (let rune = 0; rune < 8; rune += 1) {
      const a = rune * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(site.x + Math.cos(a) * 74, site.y + Math.sin(a) * 74);
      ctx.lineTo(site.x + Math.cos(a) * 85, site.y + Math.sin(a) * 85); ctx.stroke();
    }
  }
  for (const [x, y, color] of [[MAP.blueCoreX, MAP.blueCoreY, '#68bcb2'], [MAP.redCoreX, MAP.redCoreY, '#c98078']]) {
    ctx.fillStyle = '#46615c44'; ctx.beginPath(); ctx.arc(x, y, 128, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 122, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 100, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore(); texture.refresh();
  return scene.add.image(0, 0, 'arena-terrain').setOrigin(0).setDepth(-20);
}
