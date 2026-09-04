export const MAX_FRAME_BYTES = 32 * 1024;
export const MAX_INPUT_BYTES = 8 * 1024;
const MAX_MESSAGES_PER_SECOND = 60;
const MAX_INPUTS_PER_SECOND = 40;
const MAX_OUTBOUND_BUFFER_BYTES = 256 * 1024;

export function parseFrame(raw) {
  let value;
  try { value = JSON.parse(raw.toString('utf8')); }
  catch { return null; }
  if (!value || typeof value !== 'object' || typeof value.type !== 'string') return null;
  return {
    type: value.type.slice(0, 24),
    roomId: value.room_id ? String(value.room_id) : null,
    sessionId: value.session_id ? String(value.session_id) : null,
    protocol: String(value.protocol_version || '2'),
    seq: Number.isSafeInteger(value.seq) ? value.seq : 0,
    payload: value.payload && typeof value.payload === 'object' ? value.payload : {},
  };
}

export function payloadSize(payload) {
  try { return Buffer.byteLength(JSON.stringify(payload), 'utf8'); }
  catch { return Number.POSITIVE_INFINITY; }
}

export function allowMessage(rate, type, now = Date.now()) {
  if (!rate.windowAt || now - rate.windowAt >= 1000) {
    rate.windowAt = now;
    rate.messages = 0;
    rate.inputs = 0;
  }
  rate.messages += 1;
  if (type === 'input') rate.inputs += 1;
  return rate.messages <= MAX_MESSAGES_PER_SECOND && rate.inputs <= MAX_INPUTS_PER_SECOND;
}

export function sendFrame(socket, type, payload = {}) {
  if (!socket || socket.readyState !== 1) return false;
  if (socket.bufferedAmount > MAX_OUTBOUND_BUFFER_BYTES) {
    try { socket.close(4008, 'Slow consumer'); } catch { /* already closed */ }
    return false;
  }
  try { socket.send(JSON.stringify({ type, payload })); return true; }
  catch { return false; }
}

export function rejectSocket(socket, code, message, closeCode = 4003) {
  sendFrame(socket, 'error', { code, message });
  try { socket.close(closeCode, message.slice(0, 100)); } catch { /* already closed */ }
}
