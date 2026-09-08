import { battlefieldRegions } from '../../server/geometry.js';
import { prepareCanvas } from '../game/display.js';

export function drawRegions(ctx, regions, padding = 0) {
  for (const region of regions) {
    const radius = region.radius + padding;
    ctx.beginPath();
    if (region.kind === 'circle') ctx.arc(region.x, region.y, radius, 0, Math.PI * 2);
    else {
      ctx.lineWidth = radius * 2; ctx.lineCap = 'round';
      ctx.moveTo(region.start.x, region.start.y); ctx.lineTo(region.end.x, region.end.y);
      ctx.stroke();
      continue;
    }
    ctx.fill();
  }
}

export function drawMinimap(canvas, snapshot) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const sx = width / snapshot.map.width, sy = height / snapshot.map.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#081b20'; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.scale(sx, sy);
  ctx.fillStyle = ctx.strokeStyle = '#4a6157'; drawRegions(ctx, battlefieldRegions());
  ctx.fillStyle = 'rgba(78,230,224,.17)';
  for (const source of snapshot.vision) {
    ctx.beginPath(); ctx.arc(source.x, source.y, source.radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const dot = (entity, color, size) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(entity.x * sx, entity.y * sy, size, 0, Math.PI * 2); ctx.fill();
  };
  for (const site of snapshot.map.campSites) {
    // Sites are public terrain; only visible living bosses get a filled marker.
    ctx.strokeStyle = '#b7a47b'; ctx.lineWidth = 1; ctx.strokeRect(site.x * sx - 2, site.y * sy - 2, 4, 4);
  }
  for (const camp of snapshot.camps) dot(camp, '#f5c66a', 2.5);
  for (const structure of Object.values(snapshot.structures)) if (structure.hp > 0) dot(structure, structure.team === snapshot.team ? '#4ee6e0' : '#ff6b72', structure.kind === 'core' ? 4.5 : 3);
  for (const minion of snapshot.minions) dot(minion, minion.team === snapshot.team ? '#75f3ed' : '#ff858b', 1.3);
  for (const player of Object.values(snapshot.players)) if (Number.isFinite(player.x)) dot(player, player.id === snapshot.you ? '#ffffff' : '#ff6b72', 3);
}
