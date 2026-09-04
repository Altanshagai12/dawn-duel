export function nextRandom(world) {
  world.seed = (Math.imul(world.seed >>> 0, 1664525) + 1013904223) >>> 0;
  return world.seed / 4294967296;
}

export function seededOrder(ids, seed) {
  const ranked = ids.map((id, index) => {
    let value = (seed ^ Math.imul(index + 1, 2654435761)) >>> 0;
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return { id, value };
  });
  ranked.sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  return ranked.map(item => item.id);
}
