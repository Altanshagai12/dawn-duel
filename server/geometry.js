import { MAP } from './config.js';
import { roundAround } from './math.js';

export function teamDirection(team) {
  const sign = team === 0 ? 1 : -1;
  return { x: MAP.laneUnitX * sign, y: MAP.laneUnitY * sign };
}

export function spawnPoint(team) {
  return team === 0
    ? { x: MAP.blueSpawnX, y: MAP.blueSpawnY }
    : { x: MAP.redSpawnX, y: MAP.redSpawnY };
}

export function laneProgress(point) {
  return (point.x - MAP.blueCoreX) * MAP.laneUnitX
    + (point.y - MAP.blueCoreY) * MAP.laneUnitY;
}

export function laneOffset(point) {
  return (point.x - MAP.blueCoreX) * MAP.laneNormalX
    + (point.y - MAP.blueCoreY) * MAP.laneNormalY;
}

export function lanePoint(progress, offset = 0) {
  return {
    x: MAP.blueCoreX + MAP.laneUnitX * progress + MAP.laneNormalX * offset,
    y: MAP.blueCoreY + MAP.laneUnitY * progress + MAP.laneNormalY * offset,
  };
}

function segmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length2 = dx * dx + dy * dy;
  const raw = length2 ? ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2 : 0;
  const t = Math.max(0, Math.min(1, raw));
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}

export function isBattlefieldWalkable(point, radius = 0) {
  const start = { x: MAP.blueCoreX, y: MAP.blueCoreY };
  const end = { x: MAP.redCoreX, y: MAP.redCoreY };
  const laneRadius = Math.max(0, MAP.laneWidth / 2 - radius);
  if (segmentDistanceSquared(point, start, end) <= laneRadius ** 2) return true;
  const pocketRadius = Math.max(0, MAP.campPocketRadius - radius);
  const pathRadius = Math.max(0, MAP.campPathRadius - radius);
  return MAP.campSites.some(site => {
    const progress = Math.max(0, Math.min(MAP.laneLength, laneProgress(site)));
    const approach = lanePoint(progress);
    const inPocket = (point.x - site.x) ** 2 + (point.y - site.y) ** 2 <= pocketRadius ** 2;
    return inPocket || segmentDistanceSquared(point, approach, site) <= pathRadius ** 2;
  });
}

export function formationPoint(team, advance, offset = 0) {
  const spawn = spawnPoint(team);
  const direction = teamDirection(team);
  const sign = team === 0 ? 1 : -1;
  return {
    x: roundAround(spawn.x + direction.x * advance + MAP.laneNormalX * offset * sign, MAP.width / 2),
    y: roundAround(spawn.y + direction.y * advance + MAP.laneNormalY * offset * sign, MAP.height / 2),
  };
}

export function isOwnHalf(point, team) {
  const side = laneProgress(point) < MAP.riverProgress ? 0 : 1;
  return side === team;
}

export function clampToOwnHalf(point, team, radius = 0) {
  const progress = laneProgress(point);
  const limit = MAP.riverProgress + (team === 0 ? -radius : radius);
  if ((team === 0 && progress <= limit) || (team === 1 && progress >= limit)) return point;
  const offset = laneOffset(point);
  return lanePoint(limit, offset);
}
