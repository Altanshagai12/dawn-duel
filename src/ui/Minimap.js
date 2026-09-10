import { battlefieldRegions } from '../../server/geometry.js';
import { prepareCanvas } from '../game/display.js';

const CACHE = new WeakMap();

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

function staticLayerFor(canvas, map, width, height) {
  let cache = CACHE.get(canvas);
  if (!cache) {
    const layer = canvas.ownerDocument?.createElement('canvas') || document.createElement('canvas');
    cache = { layer, sites: [] };
    CACHE.set(canvas, cache);
  }
  const sites = map.campSites || [];
  let stale = cache.width !== canvas.width || cache.height !== canvas.height
    || cache.mapWidth !== map.width || cache.mapHeight !== map.height || cache.sites.length !== sites.length * 2;
  for (let index = 0; index < sites.length && !stale; index += 1) {
    stale = cache.sites[index * 2] !== sites[index].x || cache.sites[index * 2 + 1] !== sites[index].y;
  }
  if (!stale) return cache.layer;

  cache.width = cache.layer.width = canvas.width;
  cache.height = cache.layer.height = canvas.height;
  cache.mapWidth = map.width;
  cache.mapHeight = map.height;
  cache.sites.length = sites.length * 2;
  const pixelRatioX = canvas.width / width, pixelRatioY = canvas.height / height;
  const ctx = cache.layer.getContext('2d');
  ctx.setTransform(pixelRatioX, 0, 0, pixelRatioY, 0, 0);
  ctx.fillStyle = '#081b20'; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.scale(width / map.width, height / map.height);
  ctx.fillStyle = ctx.strokeStyle = '#4a6157'; drawRegions(ctx, battlefieldRegions());
  ctx.restore();
  for (let index = 0; index < sites.length; index += 1) {
    const site = sites[index];
    cache.sites[index * 2] = site.x;
    cache.sites[index * 2 + 1] = site.y;
    ctx.strokeStyle = '#b7a47b'; ctx.lineWidth = 1;
    ctx.strokeRect(site.x * width / map.width - 2, site.y * height / map.height - 2, 4, 4);
  }
  return cache.layer;
}

function dot(ctx, entity, sx, sy, color, size) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(entity.x * sx, entity.y * sy, size, 0, Math.PI * 2);
  ctx.fill();
}

export function drawMinimap(canvas, snapshot) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const sx = width / snapshot.map.width, sy = height / snapshot.map.height;
  const layer = staticLayerFor(canvas, snapshot.map, width, height);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, 0, 0); ctx.restore();
  ctx.save(); ctx.scale(sx, sy);
  ctx.fillStyle = 'rgba(78,230,224,.17)';
  for (const source of snapshot.vision) {
    ctx.beginPath(); ctx.arc(source.x, source.y, source.radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  for (const camp of snapshot.camps) dot(ctx, camp, sx, sy, '#f5c66a', 2.5);
  for (const id in snapshot.structures) {
    const structure = snapshot.structures[id];
    if (structure.hp > 0) dot(ctx, structure, sx, sy,
      structure.team === snapshot.team ? '#4ee6e0' : '#ff6b72', structure.kind === 'core' ? 4.5 : 3);
  }
  for (const minion of snapshot.minions) dot(ctx, minion, sx, sy,
    minion.team === snapshot.team ? '#75f3ed' : '#ff858b', 1.3);
  for (const id in snapshot.players) {
    const player = snapshot.players[id];
    if (Number.isFinite(player.x)) dot(ctx, player, sx, sy, player.id === snapshot.you ? '#ffffff' : '#ff6b72', 3);
  }
}
