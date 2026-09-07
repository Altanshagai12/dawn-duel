import { MAP, VISION } from './config.js';
import { distanceSquared } from './math.js';
import { publicMatch } from './world.js';

function sourceRadius(source, now = 0) {
  if (source.kind === 'player') return source.spiritUntil > now ? VISION.wounded : VISION.hero;
  if (source.kind === 'tower') return VISION.tower;
  if (source.kind === 'core') return VISION.core;
  return VISION[source.minionType] || VISION.melee;
}

export function visionSources(world, team) {
  const sources = [];
  for (const player of Object.values(world.players)) {
    if (player.team !== team) continue;
    const base = sourceRadius(player, world.matchTime);
    const ratio = player.relic === 'scout' && player.relicUntil > world.matchTime ? VISION.scoutRatio : 1;
    sources.push({ x: player.x, y: player.y, radius: base * ratio, kind: 'hero' });
  }
  for (const minion of world.minions) {
    if (minion.team === team && minion.hp > 0) {
      sources.push({ x: minion.x, y: minion.y, radius: sourceRadius(minion, world.matchTime), kind: 'minion' });
    }
  }
  for (const structure of Object.values(world.structures)) {
    if (structure.team === team && structure.hp > 0) {
      sources.push({ x: structure.x, y: structure.y, radius: sourceRadius(structure, world.matchTime), kind: structure.kind });
    }
  }
  return sources;
}

export function isPointVisible(world, team, point) {
  return visionSources(world, team).some(source => {
    const radius = source.radius + (point.radius || 0);
    return distanceSquared(source, point) <= radius * radius;
  });
}

function playerSummary(world, player, visible, viewerId) {
  const common = {
    id: player.id,
    kind: 'player',
    name: player.name,
    team: player.team,
    hero: player.id === viewerId || world.phase !== 'select' ? player.hero : null,
    selected: Boolean(player.hero),
    ready: Boolean(player.ready),
    host: player.id === world.hostId,
    connected: player.connected,
    level: player.level,
    kills: player.kills,
    deaths: player.deaths,
    visible,
  };
  if (!visible && player.id !== viewerId) return common;
  return {
    ...common,
    x: player.x,
    y: player.y,
    radius: player.radius,
    hp: player.hp,
    maxHp: player.maxHp,
    shield: player.shield,
    spiritUntil: player.spiritUntil,
    protectUntil: player.protectUntil,
    slowUntil: player.slowUntil,
    slowRatio: player.slowRatio,
    skillReady: player.skillReady,
    basicReadyAt: player.basicReadyAt,
    offer: player.offer,
    offerExpiresAt: player.offerExpiresAt,
    relicOffer: player.relicOffer,
    relic: player.relic,
    relicUntil: player.relicUntil,
    surgeUntil: player.surgeUntil,
    ranks: player.ranks,
    xp: player.xp,
  };
}

function visibleMobile(world, team, entity) {
  return entity.team === team || isPointVisible(world, team, entity);
}

function publicProjectile(projectile) {
  return {
    id: projectile.id,
    kind: 'projectile',
    projectileType: projectile.projectileType,
    team: projectile.team,
    x: projectile.x,
    y: projectile.y,
    dx: projectile.dx,
    dy: projectile.dy,
    radius: projectile.radius,
  };
}

export function filterSnapshot(world, viewerId) {
  const viewer = world.players[viewerId];
  if (!viewer) return null;
  const team = viewer.team;
  const players = {};
  for (const player of Object.values(world.players)) {
    const visible = player.team === team || isPointVisible(world, team, player) || player.revealUntil > world.matchTime;
    players[player.id] = playerSummary(world, player, visible, viewerId);
  }
  const filter = entity => visibleMobile(world, team, entity);
  return {
    version: world.version,
    tick: world.snapshotTick,
    now: world.matchTime,
    you: viewerId,
    team,
    map: MAP,
    match: publicMatch(world),
    players,
    minions: world.minions.filter(filter),
    clones: world.clones.filter(filter),
    camps: world.camps.filter(camp => camp.alive && isPointVisible(world, team, camp)),
    buffSites: world.buffSites.map(site => {
      const visible = isPointVisible(world, team, { ...site, radius: MAP.buffPocketRadius });
      return {
        id: site.id,
        kind: site.kind,
        x: site.x,
        y: site.y,
        color: site.color,
        visible,
        available: visible ? site.available : null,
        spawnAt: visible ? site.spawnAt : null,
        captureTeam: visible ? site.captureTeam : null,
        captureProgress: visible ? site.captureProgress : 0,
      };
    }),
    structures: world.structures,
    projectiles: world.projectiles
      .filter(projectile => isPointVisible(world, team, projectile))
      .map(publicProjectile),
    effects: world.effects.filter(effect => {
      if (!Number.isFinite(effect.x)) return true;
      if (!isPointVisible(world, team, effect)) return false;
      return !Number.isFinite(effect.tx) || isPointVisible(world, team, { x: effect.tx, y: effect.ty });
    }),
    vision: visionSources(world, team),
  };
}
