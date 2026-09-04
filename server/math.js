export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function normalize(x, y, fallbackX = 1, fallbackY = 0) {
  const nx = Number(x);
  const ny = Number(y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return { x: fallbackX, y: fallbackY, length: 0 };
  const length = Math.hypot(nx, ny);
  if (length < 0.0001) return { x: 0, y: 0, length: 0 };
  return { x: nx / length, y: ny / length, length: Math.min(1, length) };
}

export function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function circlesTouch(a, b, padding = 0) {
  const radius = (a.radius || 0) + (b.radius || 0) + padding;
  return distanceSquared(a, b) <= radius * radius;
}

export function round(value, precision = 10) {
  return Math.sign(value) * Math.round(Math.abs(value) * precision) / precision;
}

export function roundAround(value, center, precision = 10) {
  return center + round(value - center, precision);
}

export function stableSortByDistance(items, point) {
  return items.slice().sort((a, b) => {
    const delta = distanceSquared(a, point) - distanceSquared(b, point);
    return Math.abs(delta) > 0.0001 ? delta : String(a.id).localeCompare(String(b.id));
  });
}

export function segmentCircleHit(ax, ay, bx, by, circle, extra = 0) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = circle.x - ax;
  const wy = circle.y - ay;
  const length2 = vx * vx + vy * vy || 1;
  const t = clamp((wx * vx + wy * vy) / length2, 0, 1);
  const dx = ax + vx * t - circle.x;
  const dy = ay + vy * t - circle.y;
  const radius = (circle.radius || 0) + extra;
  return dx * dx + dy * dy <= radius * radius ? t : null;
}
