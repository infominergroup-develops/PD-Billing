import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { signSession, verifySession, verifyPassword, stripDangerousKeys, buildAuditLog, parseOrigins } from './security.js';

const SECRET = 'x'.repeat(48);
const user = { id: 'u1', email: 'a@b.in', name: 'A', role: 'admin' };

describe('session tokens', () => {
  it('round-trips a valid token', () => {
    expect(verifySession(signSession(user, SECRET), SECRET)).toMatchObject(user);
  });
  it('rejects expired, tampered, foreign-key and malformed tokens', () => {
    const now = Date.now();
    expect(verifySession(signSession(user, SECRET, 1000, now), SECRET, now + 2000)).toBeNull();

    const [body, sig] = signSession(user, SECRET).split('.');
    const forged = Buffer.from(JSON.stringify({ ...user, role: 'admin', email: 'evil@x', exp: now + 1e9 })).toString('base64url');
    expect(verifySession(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifySession(`${body}.${sig}`, 'y'.repeat(48))).toBeNull();

    for (const bad of [undefined, '', 'abc', 'a.b.c', '.', 42, { a: 1 }, 'x'.repeat(5000)]) {
      expect(verifySession(bad, SECRET)).toBeNull();
    }
  });
});

describe('verifyPassword', () => {
  it('checks bcrypt hashes', async () => {
    const hash = await bcrypt.hash('s3cret!', 4);
    expect(await verifyPassword('s3cret!', hash)).toEqual({ ok: true, needsRehash: false });
    expect((await verifyPassword('wrong', hash)).ok).toBe(false);
  });
  it('accepts legacy plain text and flags it for rehash', async () => {
    expect(await verifyPassword('pw', 'pw')).toEqual({ ok: true, needsRehash: true });
    expect((await verifyPassword('pw', 'pw2')).ok).toBe(false);
  });
  it('rejects non-string and empty input (NoSQL / type-confusion attempts)', async () => {
    for (const input of [{ $ne: null }, ['pw'], null, undefined, '', 0]) {
      expect((await verifyPassword(input, 'pw')).ok).toBe(false);
    }
    expect((await verifyPassword('pw', undefined)).ok).toBe(false);
  });
});

describe('stripDangerousKeys', () => {
  it('drops Mongo operators and prototype keys at any depth, keeps data', () => {
    const input = JSON.parse(
      '{"rates":[{"client":"A","$where":"1"}],"$set":{"x":1},"__proto__":{"admin":true},"nested":{"$unset":{"a":1},"ok":"yes"},"KM feeded by MIS":5}'
    );
    const out = stripDangerousKeys(input);
    expect(out).toEqual({ rates: [{ client: 'A' }], nested: { ok: 'yes' }, 'KM feeded by MIS': 5 });
    expect({}.admin).toBeUndefined();
  });
  it('refuses absurd nesting', () => {
    let deep = {};
    for (let i = 0; i < 50; i++) deep = { d: deep };
    expect(() => stripDangerousKeys(deep)).toThrow(/deeply/);
  });
});

describe('buildAuditLog', () => {
  it('takes identity from the session, not the request body', () => {
    const entry = buildAuditLog({ action: 'UPLOAD_DATA', description: 'x', user: 'Mallory', userRole: 'admin' }, user, '1.2.3.4');
    expect(entry).toMatchObject({ action: 'UPLOAD_DATA', user: 'A', userEmail: 'a@b.in', userRole: 'admin', ipAddress: '1.2.3.4' });
  });
  it('rejects unknown-shaped actions and truncates long fields', () => {
    expect(buildAuditLog({ action: 'drop table' }, user, '')).toBeNull();
    expect(buildAuditLog({ action: { $gt: '' } }, user, '')).toBeNull();
    expect(buildAuditLog({ action: 'X', description: 'a'.repeat(5000) }, user, '').description).toHaveLength(1000);
  });
});

it('parseOrigins normalises the allow-list', () => {
  expect([...parseOrigins(' https://a.com/ , https://b.com,,')]).toEqual(['https://a.com', 'https://b.com']);
});
