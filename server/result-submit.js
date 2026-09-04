import { createHash, createHmac } from 'node:crypto';

const RESULT_PATH = '/games/direct/results';

export function resultIdempotencyKey(serviceId, roomId, sessionId) {
  return createHash('sha256').update(`${serviceId}\n${roomId}\n${sessionId}`).digest('hex');
}

export function createResultPayload({ serviceId, roomId, sessionId, world }) {
  const isDraw = world.winnerTeam === null;
  const participants = isDraw ? [] : [...world.playerOrder];
  const winnerIds = isDraw ? [] : participants.filter(id => world.players[id]?.team === world.winnerTeam);
  const finalStats = isDraw ? {} : Object.fromEntries(participants.map(id => [id, {
    kills: world.players[id]?.kills || 0,
    deaths: world.players[id]?.deaths || 0,
    level: world.players[id]?.level || 1,
  }]));
  return {
    room_id: roomId,
    session_id: sessionId,
    service_id: serviceId,
    winner_ids: winnerIds,
    participants,
    reason: isDraw && world.finishReason === 'time'
      ? 'draw' : (world.finishReason === 'time' ? 'timeout' : (world.finishReason || 'completed')),
    final_stats: finalStats,
    ended_at: new Date().toISOString(),
  };
}

export async function submitResult({
  apiUrl, serviceId, sharedSecret, keyId, idempotencyKey, payload,
  fetchImpl = fetch, timeoutMs = 10_000,
}) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const canonical = `${timestamp}\nPOST\n${RESULT_PATH}\n${bodyHash}`;
  const signature = createHmac('sha256', sharedSecret).update(canonical).digest('hex');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${String(apiUrl).replace(/\/$/, '')}${RESULT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Usion-Service-Id': serviceId,
        'X-Usion-Key-Id': keyId,
        'X-Usion-Signature': signature,
        'X-Usion-Timestamp': timestamp,
        'X-Idempotency-Key': idempotencyKey,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Result submission failed (${response.status})`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}
