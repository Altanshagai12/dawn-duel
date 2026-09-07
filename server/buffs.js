import { BUFFS, MAP } from './config.js';
import { addEffect } from './effects.js';
import { distanceSquared } from './math.js';

function playersInside(world, site) {
  const radius = MAP.buffPocketRadius;
  return Object.values(world.players).filter(player => player.connected
    && player.hero
    && player.spiritUntil <= world.matchTime
    && distanceSquared(player, site) <= radius ** 2);
}

function spawnSite(world, site) {
  site.available = true;
  site.captureTeam = null;
  site.captureProgress = 0;
  addEffect(world, 'buffSpawn', { x: site.x, y: site.y, buffId: site.id }, 0.8);
}

function captureSite(world, site, player) {
  site.available = false;
  site.spawnAt = world.matchTime + BUFFS.respawnSeconds;
  site.captureTeam = null;
  site.captureProgress = 0;
  player.surgeUntil = world.matchTime + BUFFS.effectSeconds;
  player.buffCaptures += 1;
  addEffect(world, 'buffCapture', {
    x: site.x,
    y: site.y,
    team: player.team,
    targetId: player.id,
    buffId: site.id,
    radius: MAP.buffPocketRadius,
  }, 0.9);
}

export function updateBuffSites(world, dt) {
  for (const site of world.buffSites) {
    if (!site.available) {
      if (world.matchTime >= site.spawnAt) spawnSite(world, site);
      continue;
    }
    const inside = playersInside(world, site);
    const teams = new Set(inside.map(player => player.team));
    if (inside.length !== 1 || teams.size !== 1) {
      site.captureTeam = null;
      site.captureProgress = 0;
      continue;
    }
    const [player] = inside;
    if (site.captureTeam !== player.team) {
      site.captureTeam = player.team;
      site.captureProgress = 0;
    }
    site.captureProgress = Math.min(1, site.captureProgress + dt / BUFFS.captureSeconds);
    if (site.captureProgress >= 1) captureSite(world, site, player);
  }
}
