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
    relic: player.relic,
    relicUntil: player.relicUntil,
    bossPowerUntil: player.bossPowerUntil,
    markUntil: player.precisionMark?.until || 0,
    markOwnerId: player.precisionMark?.sourceId || null,
    cinderUntil: player.cinderUntil,
    attackAt: player.attackAt,
    attackAngle: player.attackAngle,
    attackAimX: Number.isFinite(player.attackAngle) ? Math.cos(player.attackAngle) : 0,
    attackAimY: Number.isFinite(player.attackAngle) ? Math.sin(player.attackAngle) : 0,
    ...(player.id === viewerId ? {
      attackTargetId: player.attackTargetId,
      attackMode: player.lastAttackMode || player.input.attackMode || 'manual',
      attackPress: player.input.attackPress || 0,
      riposteDamage: player.riposteDamage,
      riposteUntil: player.riposteUntil,
      cinderCharges: player.cinderCharges,
      skillReady: player.skillReady,
      basicReadyAt: player.basicReadyAt,
      skill1Press: player.input.skill1Press || 0,
      skill2Press: player.input.skill2Press || 0,
      guardianProgress: [0, 1].map(side => world.campProgress[side].killerId === viewerId ? world.campProgress[side].ids.length : 0),
      offer: player.offer,
      offerExpiresAt: player.offerExpiresAt,
      offerRerolled: Boolean(player.offerRerolled),
      relicOffer: player.relicOffer,
      ranks: player.ranks,
      xp: player.xp,
    } : {}),
  };
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
  const vision = visionSources(world, team);
  const visiblePoint = point => vision.some(source => distanceSquared(source, point) <= (source.radius + (point.radius || 0)) ** 2);
  const players = {};
  for (const player of Object.values(world.players)) {
    const visible = player.team === team || visiblePoint(player) || player.revealUntil > world.matchTime;
    players[player.id] = playerSummary(world, player, visible, viewerId);
  }
  const filter = entity => entity.team === team || visiblePoint(entity);
  const own = players[viewerId];
  if (own.attackTargetId) {
    const target = world.players[own.attackTargetId] || world.minions.find(item => item.id === own.attackTargetId)
      || world.clones.find(item => item.id === own.attackTargetId) || world.camps.find(item => item.id === own.attackTargetId)
      || world.structures[own.attackTargetId];
    if (!target || target.hp <= 0 || !(visiblePoint(target) || target.revealUntil > world.matchTime)) own.attackTargetId = null;
  }
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
    camps: world.camps.filter(camp => camp.alive && visiblePoint(camp)),
    structures: world.structures,
    projectiles: world.projectiles
      .filter(visiblePoint)
      .map(publicProjectile),
    effects: world.effects.filter(effect => {
      if (effect.kind === 'defeat' && effect.targetId === viewerId) return true;
      if (!Number.isFinite(effect.x)) return true;
      if (!visiblePoint(effect)) return false;
      return !Number.isFinite(effect.tx) || visiblePoint({ x: effect.tx, y: effect.ty });
    }),
    vision,
  };
}
