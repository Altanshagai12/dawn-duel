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
  for (let y = 0; y < MAP.height; y += size) for (let x = 0; x < MAP.width; x += size) ctx.drawImage(image, x, y, size, size);
}

export function createTerrain(scene) {
  const texture = scene.textures.createCanvas('arena-terrain', MAP.width, MAP.height);
  const ctx = texture.context;
  const regions = battlefieldRegions();
  material(ctx, scene.textures.get('forest').getSourceImage(), 740);
  // Opaque walls around the union: internal corridor intersections stay open.
  for (const [padding, color] of [[20, '#0a1818'], [14, '#364c43'], [7, '#819079']]) {
    ctx.fillStyle = ctx.strokeStyle = color;
    drawRegions(ctx, regions, padding);
  }
  ctx.save(); clipRegions(ctx, regions);
  material(ctx, scene.textures.get('flagstone').getSourceImage(), 480);
  const lane = regions.filter(region => region.surface === 'lane');
  ctx.globalAlpha = .16; ctx.fillStyle = ctx.strokeStyle = '#d6c393'; drawRegions(ctx, lane, -14); ctx.globalAlpha = 1;
  // Center crossing and team-facing lane markers communicate the single objective.
  for (let progress = 180; progress < MAP.laneLength - 100; progress += 125) {
    const p = lanePoint(progress), side = progress < MAP.riverProgress ? 0 : 1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(MAP.laneUnitY, MAP.laneUnitX) + (side ? Math.PI : 0));
    ctx.strokeStyle = side ? '#b1746e' : '#589e95'; ctx.lineWidth = 2; ctx.globalAlpha = .65;
    ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(5, 0); ctx.lineTo(-8, 11); ctx.stroke(); ctx.restore();
  }
  for (const [index, site] of MAP.campSites.entries()) {
    ctx.fillStyle = site.side ? '#615c5c' : '#516963';
    ctx.beginPath(); ctx.arc(site.x, site.y, 87, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = index % 2 ? '#c7a8dc' : '#d5bf7f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(site.x, site.y, 79, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(site.x, site.y, 62, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.textAlign = 'center'; ctx.font = 'bold 20px system-ui'; ctx.fillText(index % 2 ? 'II' : 'I', site.x, site.y + 6);
  }
  for (const [x, y, color] of [[MAP.blueCoreX, MAP.blueCoreY, '#68bcb2'], [MAP.redCoreX, MAP.redCoreY, '#c98078']]) {
    ctx.fillStyle = '#52655c'; ctx.beginPath(); ctx.arc(x, y, 128, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 122, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 100, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore(); texture.refresh();
  return scene.add.image(0, 0, 'arena-terrain').setOrigin(0).setDepth(-20);
}
