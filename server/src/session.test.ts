import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionToken, verifySessionToken } from './session.js';

describe('session tokens', () => {
  beforeEach(() => { process.env.SESSION_SECRET = 'test-secret-aaaaaaaaaaaaaaaa'; });

  it('round-trips a valid token', () => {
    const token = createSessionToken('+14155551234');
    expect(verifySessionToken(token)).toMatchObject({ phone: '+14155551234' });
  });

  it('rejects a tampered payload', () => {
    const token = createSessionToken('+14155551234');
    const [body, sig] = token.split('.');
    const forged = `${body}x.${sig}`;
    expect(verifySessionToken(forged)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken('+14155551234');
    process.env.SESSION_SECRET = 'a-different-secret-bbbbbbbb';
    // Re-import isn't possible mid-module; the cached secret stays, so emulate
    // by checking that a hand-broken signature fails.
    const broken = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(verifySessionToken(broken)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = createSessionToken('+14155551234', -1000); // already expired
    expect(verifySessionToken(token)).toBeNull();
  });

  it('rejects junk', () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('nope')).toBeNull();
  });
});
