export function addEffect(world, kind, data = {}, ttl = 0.35) {
  const effect = {
    id: `fx${world.nextEntityId++}`,
    kind,
    expiresAt: world.matchTime + ttl,
    ...data,
  };
  world.effects.push(effect);
  if (world.effects.length > 64) world.effects.splice(0, world.effects.length - 64);
  return effect;
}

export function updateEffects(world) {
  world.effects = world.effects.filter(effect => effect.expiresAt > world.matchTime);
}
