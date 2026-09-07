import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const JWKS_OPTIONS = {
  timeoutDuration: 15_000,
  cacheMaxAge: 300_000,
  cooldownDuration: 1_000,
};
const FORCED_REFRESH_COOLDOWN_MS = 5_000;

function isJwksRetryableError(error) {
  const code = String(error?.code || '');
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  return code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
    || code === 'ERR_JWKS_NO_MATCHING_KEY'
    || name === 'JWSSignatureVerificationFailed'
    || name === 'JWKSNoMatchingKey'
    || message.includes('signature verification failed')
    || message.includes('no applicable key')
    || message.includes('no matching key');
}

function requiredIdentityClaim(payload, key, maxLength) {
  const value = payload?.[key];
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`Access token has invalid ${key}`);
  }
  return value;
}

function optionalIdentityClaim(payload, key, maxLength) {
  if (!Object.hasOwn(payload || {}, key)) return null;
  return requiredIdentityClaim(payload, key, maxLength);
}

function verifiedDisplayName(payload) {
  const value = typeof payload?.name === 'string' && payload.name.trim() ? payload.name : 'Player';
  const normalized = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return (normalized || 'Player').slice(0, 24);
}

export function createAccessVerifier({ serviceId, jwksUrl }) {
  if (!serviceId || !jwksUrl) throw new Error('serviceId and jwksUrl are required');
  let keys = createRemoteJWKSet(new URL(jwksUrl), JWKS_OPTIONS);
  let lastForcedRefreshAt = 0;

  const verify = (token, keySet) => jwtVerify(token, keySet, {
    issuer: 'usion-backend',
    audience: `usion-game-service:${serviceId}`,
    algorithms: ['RS256'],
    requiredClaims: ['iat', 'exp'],
    clockTolerance: 60,
  });

  return async token => {
    let decoded;
    try { decoded = decodeJwt(token); }
    catch { throw new Error('Malformed access token'); }
    if (decoded?.service_id !== serviceId) throw new Error('Token service mismatch');

    let verified;
    const attemptedKeys = keys;
    try {
      verified = await verify(token, attemptedKeys);
    } catch (error) {
      if (!isJwksRetryableError(error)) throw error;
      const now = Date.now();
      // The first failed verifier generation replaces the shared key set. All
      // concurrent failures then reuse that same generation, whose own remote
      // loader single-flights the HTTP request. A cooldown bounds repeated bad
      // signatures to one forced platform fetch per five seconds.
      if (keys === attemptedKeys) {
        if (now - lastForcedRefreshAt < FORCED_REFRESH_COOLDOWN_MS) throw error;
        lastForcedRefreshAt = now;
        keys = createRemoteJWKSet(new URL(jwksUrl), JWKS_OPTIONS);
      }
      // The platform can rotate key material while retaining the same `kid`.
      // Retrying against the fresh shared generation admits the new legitimate
      // key without allowing each failing socket to create its own JWKS fetch.
      verified = await verify(token, keys);
    }
    const { payload } = verified;
    if (!Number.isSafeInteger(payload.iat)) throw new Error('Access token has invalid iat');
    const id = requiredIdentityClaim(payload, 'sub', 80);
    const roomId = requiredIdentityClaim(payload, 'room_id', 120);
    const sessionId = requiredIdentityClaim(payload, 'session_id', 120);
    // Production tokens minted before the host_id rollout do not carry this
    // claim. They are still platform-signed and room/session bound. When the
    // claim is present, keep validating it strictly and let it take precedence.
    const hostId = optionalIdentityClaim(payload, 'host_id', 80);
    if (!Array.isArray(payload.permissions) || !payload.permissions.includes('play')) {
      throw new Error('Access token is missing play permission');
    }
    return {
      id,
      name: verifiedDisplayName(payload),
      roomId,
      sessionId,
      hostId,
      serviceId: String(payload.service_id),
    };
  };
}
