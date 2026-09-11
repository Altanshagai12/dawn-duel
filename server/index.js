import { MATCH } from './config.js';
import { filterSnapshot } from './fog.js';
import { applyCommand } from './inputs.js';
import { reconnectPlayer, stepWorld } from './sim.js';
import { addPlayer, createWorld, establishHost, removePlayer } from './world.js';
import { CHOICE_TYPES } from './choice-commands.js';

export const config = {
  profile: 'realtime',
  maxPlayers: 2,
  tickHz: MATCH.tickHz,
  snapshotHz: MATCH.snapshotHz,
  aoi: false,
};

function sendSnapshot(room, id) {
  const counters = room.state.snapshotSequences ||= Object.create(null);
  const sequence = counters[id] = (counters[id] || 0) + 1;
  room.send(id, 'duel_snapshot', { ...filterSnapshot(room.state.world, id), sequence });
}

function sendSnapshots(room) {
  for (const id of room.state.world.playerOrder) {
    const player = room.state.world.players[id];
    if (player?.connected) sendSnapshot(room, id);
  }
}

export function init(room) {
  room.state = { entities: {}, world: createWorld(20260904), snapshotSequences: Object.create(null) };
}

export function onJoin(room, player) {
  const world = room.state.world;
  const hostOptions = { replace: player.replaceHost === true };
  if (player.hostId && !establishHost(world, player.hostId, hostOptions)) {
    room.send(player.id, 'duel_error', { code: 'HOST_MISMATCH' });
    return;
  }
  const joined = reconnectPlayer(world, player.id, player.name) || addPlayer(world, player.id, player.name);
  if (!joined) {
    room.send(player.id, 'duel_error', { code: 'ROOM_FULL' });
    return;
  }
  if (player.hostId) establishHost(world, player.hostId, hostOptions);
  sendSnapshot(room, player.id);
}

export function onLeave(room, player) {
  removePlayer(room.state.world, player.id);
}

export function onInput(room, player, input) {
  if (!input || typeof input !== 'object') return;
  const type = typeof input.type === 'string' ? input.type.slice(0, 40) : 'input';
  const data = input.data && typeof input.data === 'object' ? input.data : {};
  applyCommand(room.state.world, player.id, type, data);
  if (CHOICE_TYPES.has(type)) sendSnapshot(room, player.id);
}

export function tick(room, dt) {
  const world = room.state.world;
  if (world.ended) return;
  stepWorld(world, dt);
  if (world.phase === 'finished') {
    world.ended = true;
    sendSnapshots(room);
    room.end({ winnerTeam: world.winnerTeam, reason: world.finishReason });
    return;
  }
  if (world.snapshotTick % 2 === 0 || world.phase !== 'playing' || world.paused) sendSnapshots(room);
}
