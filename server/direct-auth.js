import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

export function createAccessVerifier({ serviceId, jwksUrl }) {
  if (!serviceId || !jwksUrl) throw new Error('serviceId and jwksUrl are required');
  const keys = createRemoteJWKSet(new URL(jwksUrl), {
    timeoutDuration: 15_000,
    cacheMaxAge: 300_000,
    cooldownDuration: 1_000,
  });

  return async token => {
    let decoded;
    try { decoded = decodeJwt(token); }
    catch { throw new Error('Malformed access token'); }
    if (decoded?.service_id !== serviceId) throw new Error('Token service mismatch');

    const { payload } = await jwtVerify(token, keys, {
      issuer: 'usion-backend',
      audience: `usion-game-service:${serviceId}`,
      algorithms: ['RS256'],
      clockTolerance: 30,
    });
    if (!payload.sub || !payload.room_id || !payload.session_id || !payload.host_id) {
      throw new Error('Access token is missing room identity');
    }
    if (!Array.isArray(payload.permissions) || !payload.permissions.includes('play')) {
      throw new Error('Access token is missing play permission');
    }
    return {
      id: String(payload.sub).slice(0, 80),
      name: String(payload.name || payload.preferred_username || payload.sub).slice(0, 24),
      roomId: String(payload.room_id).slice(0, 120),
      sessionId: String(payload.session_id).slice(0, 120),
      hostId: String(payload.host_id).slice(0, 80),
      serviceId: String(payload.service_id),
    };
  };
}
