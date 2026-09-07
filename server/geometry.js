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

export function campApproach(site) {
  return site.route?.at(-1)
    || lanePoint(Math.max(0, Math.min(MAP.laneLength, laneProgress(site))));
}

export function campGeometry(site, radius = 0) {
  const pocketRadius = Math.max(0, MAP.campPocketRadius - radius);
  const pathRadius = Math.max(0, MAP.campPathRadius - radius);
  const route = [{ x: site.x, y: site.y }, ...(site.route || [campApproach(site)])];
  const first = route[1] || route[0];
  const angle = Math.atan2(first.y - site.y, first.x - site.x);
  const halfGap = pocketRadius > 0
    ? Math.asin(Math.min(1, pathRadius / pocketRadius))
    : Math.PI;
  const wallStartDistance = Math.sqrt(Math.max(0, pocketRadius ** 2 - pathRadius ** 2));
  return { pocketRadius, pathRadius, route, angle, halfGap, wallStartDistance };
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
  const connectedToLane = site => {
    const geometry = campGeometry(site, radius);
    const inPocket = (point.x - site.x) ** 2 + (point.y - site.y) ** 2 <= geometry.pocketRadius ** 2;
    if (inPocket) return true;
    return geometry.route.slice(1).some((end, index) => (
      segmentDistanceSquared(point, geometry.route[index], end) <= geometry.pathRadius ** 2
    ));
  };
  return MAP.campSites.some(connectedToLane);
}

export function resolveWalkableMove(origin, desired, radius = 0, blocked = () => false) {
  const canOccupy = point => isBattlefieldWalkable(point, radius) && !blocked(point);
  if (canOccupy(desired)) return desired;
  const dx = desired.x - origin.x;
  const dy = desired.y - origin.y;
  if (Math.hypot(dx, dy) < 0.0001) return { x: origin.x, y: origin.y };
  for (const scale of [1, 0.66, 0.33]) {
    for (const degrees of [15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90]) {
      const angle = degrees * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const point = {
        x: origin.x + (dx * cos - dy * sin) * scale,
        y: origin.y + (dx * sin + dy * cos) * scale,
      };
      if (canOccupy(point)) return point;
    }
  }
  return { x: origin.x, y: origin.y };
}

export function traceWalkableMove(origin, desired, radius = 0, blocked = () => false, stepSize = 8) {
  const dx = desired.x - origin.x;
  const dy = desired.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.0001) return { x: origin.x, y: origin.y, fraction: 1, blocked: false };
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, stepSize)));
  let last = { x: origin.x, y: origin.y, fraction: 0, blocked: false };
  for (let step = 1; step <= steps; step += 1) {
    const fraction = step / steps;
    const point = { x: origin.x + dx * fraction, y: origin.y + dy * fraction };
    if (!isBattlefieldWalkable(point, radius) || blocked(point)) return { ...last, blocked: true };
    last = { ...point, fraction, blocked: false };
  }
  return last;
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
