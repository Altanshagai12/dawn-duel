export function addEffect(world, kind, data = {}, ttl = 0.35) {
  const effect = {
    id: `fx${world.nextEntityId++}`,
    kind,
    expiresAt: world.matchTime + ttl,
    ...data,
  };
  world.effects.push(effect);
  if (world.effects.length > 64) {
    // A live ground warning must not vanish merely because a wave fired.
    const removable = world.effects.findIndex(item => item.kind !== 'cinderZone' || item.expiresAt <= world.matchTime);
    world.effects.splice(Math.max(0, removable), 1);
  }
  return effect;
}

export function updateEffects(world) {
  world.effects = world.effects.filter(effect => effect.expiresAt > world.matchTime);
}
