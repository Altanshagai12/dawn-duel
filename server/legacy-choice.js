import { CHOICE_TYPES } from './choice-commands.js';

const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const NO_OFFER = 'legacy:none';

// v7 sent choices as fire-and-forget realtime frames with only { id }. Keep
// that compatibility at the authenticated direct transport boundary: callers
// cannot provide either identity component, and the authoritative offer is
// captured once when this frame sequence is first accepted.
export function adaptLegacyChoice(world, playerId, type, data, transport) {
  if (transport?.channel !== 'input' || !CHOICE_TYPES.has(type)
    || has(data, 'requestId') || has(data, 'offerId')
    || !Number.isSafeInteger(transport.connectionEpoch) || transport.connectionEpoch < 1
    || !Number.isSafeInteger(transport.sequence) || transport.sequence < 0) return data;
  const player = world.players[playerId];
  const current = type === 'relic' ? player?.relicOffer?.id : player?.offerId;
  const legacy = type === 'reroll' ? {} : { id: data.id };
  return {
    ...legacy,
    requestId: `legacy:${transport.connectionEpoch}:${transport.sequence}`,
    offerId: typeof current === 'string' && current ? current : NO_OFFER,
  };
}
