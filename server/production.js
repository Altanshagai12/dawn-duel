import { createDirectRuntime } from './direct-runtime.js';

const serviceId = process.env.SERVICE_ID || 'dawn-duel-668063ce';
const sharedSecret = process.env.USION_SHARED_SECRET;
if (!sharedSecret) throw new Error('USION_SHARED_SECRET is required');

const runtime = createDirectRuntime({
  serviceId,
  sharedSecret,
  keyId: process.env.USION_KEY_ID || 'direct-key-v1',
  apiUrl: process.env.USION_API_URL || 'https://mobile.mongolai.mn',
  jwksUrl: process.env.USION_JWKS_URL || 'https://mobile.mongolai.mn/.well-known/jwks.json',
  outboxPath: process.env.RESULT_OUTBOX_PATH || null,
  port: Number(process.env.PORT) || 3005,
});

runtime.listen(() => console.log(`[dawn-duel] authoritative runtime ready for ${serviceId}`));

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await runtime.close();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
