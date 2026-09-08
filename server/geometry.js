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

export function segmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length2 = dx * dx + dy * dy;
  const raw = length2 ? ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2 : 0;
  const t = Math.max(0, Math.min(1, raw));
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}

const REGIONS = Object.freeze([
  {
    kind: 'capsule', surface: 'lane', radius: MAP.laneWidth / 2,
    start: { x: MAP.blueCoreX, y: MAP.blueCoreY },
    end: { x: MAP.redCoreX, y: MAP.redCoreY },
  },
  ...MAP.campSites.flatMap(site => {
    const { route } = campGeometry(site);
    return [
      { kind: 'circle', surface: 'camp', side: site.side, x: site.x, y: site.y, radius: MAP.campPocketRadius },
      ...route.slice(1).map((end, index) => ({
        kind: 'capsule', surface: 'path', side: site.side,
        start: route[index], end, radius: MAP.campPathRadius,
      })),
    ];
  }),
].map(region => Object.freeze(region)));

// Rendering, minimap and every movement/damage trace consume this one union.
export function battlefieldRegions() { return REGIONS; }

function regionDistanceSquared(point, region) {
  return region.kind === 'circle'
    ? (point.x - region.x) ** 2 + (point.y - region.y) ** 2
    : segmentDistanceSquared(point, region.start, region.end);
}

export function isBattlefieldWalkable(point, radius = 0) {
  return REGIONS.some(region => {
    const clearance = Math.max(0, region.radius - radius);
    return regionDistanceSquared(point, region) <= clearance ** 2;
  });
}

export function resolveWalkableMove(origin, desired, radius = 0, blocked = () => false) {
  const canOccupy = point => isBattlefieldWalkable(point, radius) && !blocked(point);
  const canReach = point => canOccupy(point) && !traceWalkableMove(origin, point, radius, blocked).blocked;
  if (canReach(desired)) return desired;
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
      if (canReach(point)) return point;
    }
  }
  return { x: origin.x, y: origin.y };
}

function circleInterval(origin, delta, center, radius) {
  const x = origin.x - center.x; const y = origin.y - center.y;
  const a = delta.x * delta.x + delta.y * delta.y;
  const b = x * delta.x + y * delta.y;
  const discriminant = b * b - a * (x * x + y * y - radius * radius);
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const start = Math.max(0, (-b - root) / a);
  const end = Math.min(1, (-b + root) / a);
  return start <= end ? [start, end] : null;
}

function capsuleIntervals(origin, delta, region, radius) {
  const x = region.end.x - region.start.x; const y = region.end.y - region.start.y;
  const length = Math.hypot(x, y);
  const intervals = [circleInterval(origin, delta, region.start, radius), circleInterval(origin, delta, region.end, radius)];
  if (!length) return intervals;
  const nx = x / length; const ny = y / length;
  const ox = origin.x - region.start.x; const oy = origin.y - region.start.y;
  let start = 0; let end = 1;
  for (const [position, velocity, low, high] of [
    [ox * nx + oy * ny, delta.x * nx + delta.y * ny, 0, length],
    [-ox * ny + oy * nx, -delta.x * ny + delta.y * nx, -radius, radius],
  ]) {
    if (Math.abs(velocity) < 1e-10) {
      if (position < low || position > high) return intervals;
    } else {
      const a = (low - position) / velocity; const b = (high - position) / velocity;
      start = Math.max(start, Math.min(a, b));
      end = Math.min(end, Math.max(a, b));
      if (start > end) return intervals;
    }
  }
  intervals.push([start, end]);
  return intervals;
}

function terrainFraction(origin, delta, radius) {
  const desired = { x: origin.x + delta.x, y: origin.y + delta.y };
  // Most movement stays inside one convex lane/corridor. Avoid allocating an
  // interval union for that common case in the 30 Hz server loop.
  if (REGIONS.some(region => {
    const clearance2 = Math.max(0, region.radius - radius) ** 2;
    return regionDistanceSquared(origin, region) <= clearance2
      && regionDistanceSquared(desired, region) <= clearance2;
  })) return 1;
  const intervals = REGIONS.flatMap(region => {
    const clearance = Math.max(0, region.radius - radius);
    return region.kind === 'circle' ? [circleInterval(origin, delta, region, clearance)]
      : capsuleIntervals(origin, delta, region, clearance);
  }).filter(Boolean).sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [start, end] of intervals) {
    if (start > covered + 1e-9) break;
    covered = Math.max(covered, end);
    if (covered >= 1) break;
  }
  return covered;
}

export function traceWalkableMove(origin, desired, radius = 0, blocked = null, stepSize = 8) {
  const dx = desired.x - origin.x;
  const dy = desired.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.0001) return { x: origin.x, y: origin.y, fraction: 1, blocked: false };
  // Intersect the full movement segment with the union. Sampling terrain can
  // skip a thin wall and can even give mirrored shots different sample counts.
  const terrain = terrainFraction(origin, { x: dx, y: dy }, radius);
  const limit = terrain < 1 ? Math.max(0, terrain - 1e-7) : 1;
  if (!blocked) return { x: origin.x + dx * limit, y: origin.y + dy * limit, fraction: limit, blocked: terrain < 1 };
  const steps = Math.max(1, Math.ceil(distance * limit / Math.max(1, stepSize) - 1e-9));
  let last = { x: origin.x, y: origin.y, fraction: 0, blocked: false };
  for (let step = 1; step <= steps; step += 1) {
    const fraction = limit * step / steps;
    const point = { x: origin.x + dx * fraction, y: origin.y + dy * fraction };
    if (blocked(point)) return { ...last, blocked: true };
    last = { ...point, fraction, blocked: false };
  }
  return { ...last, blocked: terrain < 1 };
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
