import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/**
 * Lien signé « choisir mon mot de passe », valable 30 minutes et à usage unique
 * (le jti est enregistré dans eizo_event_password_links au moment de l'utilisation).
 */
const TTL = 30 * 60 * 1000;

function secret() {
  const value = process.env.EIZO_EVENTS_LINK_SECRET || process.env.CRON_SECRET;
  if (!value || value.length < 32) throw new Error('Secret de lien absent');
  return value;
}
const sign = (payload: string) => createHmac('sha256', secret()).update('eizo-password:' + payload).digest('base64url');

export function createPasswordToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), x: Date.now() + TTL, j: randomUUID() })).toString('base64url');
  return payload + '.' + sign(payload);
}

export function readPasswordToken(token: string | undefined) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { e: string; x: number; j: string };
    return data.x > Date.now() && typeof data.e === 'string' && typeof data.j === 'string' ? { email: data.e, jti: data.j } : null;
  } catch { return null; }
}
