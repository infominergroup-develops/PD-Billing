import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ═══════════════════════════════════════════════════════════════
// Server security helpers (pure; unit-tested in security.test.js)
// ═══════════════════════════════════════════════════════════════

export const SESSION_COOKIE = 'pd_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // one working day

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** HMAC-signed session token: base64url(payload).base64url(sig). Stateless, works on serverless. */
export function signSession(payload, secret, ttlMs = SESSION_TTL_MS, now = Date.now()) {
  const body = b64url(JSON.stringify({ ...payload, exp: now + ttlMs }));
  const sig = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

/** Returns the payload, or null if the token is malformed, forged or expired. */
export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

const isBcryptHash = (s) => typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);

/**
 * Accepts bcrypt hashes and (for the existing user DB) legacy plain-text passwords.
 * `needsRehash` tells the caller a plain-text password could be upgraded to a hash.
 */
export async function verifyPassword(input, stored) {
  if (typeof input !== 'string' || typeof stored !== 'string' || !input || !stored) {
    return { ok: false, needsRehash: false };
  }
  if (isBcryptHash(stored)) return { ok: await bcrypt.compare(input, stored), needsRehash: false };
  // Constant-time compare of the legacy plain-text value (hash both to equalise lengths).
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(stored).digest();
  const ok = crypto.timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}

export const hashPassword = (pw) => bcrypt.hash(pw, 12);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep-copies JSON-like data, dropping keys that MongoDB would read as operators ("$set", "$where"…)
 * or that pollute prototypes. Applied to every request body that reaches the database.
 */
export function stripDangerousKeys(value, depth = 0) {
  if (depth > 32) throw new Error('Payload nested too deeply');
  if (Array.isArray(value)) return value.map((v) => stripDangerousKeys(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || FORBIDDEN_KEYS.has(k)) continue;
      out[k] = stripDangerousKeys(v, depth + 1);
    }
    return out;
  }
  return value;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

/** Audit entries: only known fields, bounded lengths; who/when/where come from the server. */
export function buildAuditLog(body, user, ip) {
  if (!body || typeof body !== 'object') return null;
  const action = str(body.action, 40);
  if (!action || !/^[A-Z_]+$/.test(action)) return null;
  return {
    clientId: str(body.id, 80),
    action,
    description: str(body.description, 1000) || '',
    targetId: str(body.targetId, 200),
    oldValue: str(body.oldValue, 500),
    newValue: str(body.newValue, 500),
    user: user.name,
    userEmail: user.email,
    userRole: user.role,
    ipAddress: ip,
    timestamp: new Date(),
  };
}

/** Comma-separated env list → Set of exact origins. */
export function parseOrigins(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean)
  );
}
