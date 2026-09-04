import { applyCommand } from '../server/inputs.js';
import { addPlayer, createWorld } from '../server/world.js';

export function playingWorld(heroes = ['shana', 'diamond']) {
  const world = createWorld(42);
  const blue = addPlayer(world, 'blue', 'Blue');
  const red = addPlayer(world, 'red', 'Red');
  applyCommand(world, blue.id, 'select_hero', { hero: heroes[0] });
  applyCommand(world, red.id, 'select_hero', { hero: heroes[1] });
  world.phase = 'playing';
  world.matchTime = 1;
  world.roomNow = 1;
  return { world, blue, red };
}
