import { describe, it, expect, afterEach } from 'vitest';
import { normalizePhone, isAllowedAdmin, adminAllowlist } from './phone.js';

describe('normalizePhone()', () => {
  it('assumes US for bare 10 digits', () => expect(normalizePhone('415-555-1234')).toBe('+14155551234'));
  it('keeps an explicit + prefix', () => expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958'));
  it('handles 11-digit US with leading 1', () => expect(normalizePhone('1 (415) 555-1234')).toBe('+14155551234'));
  it('returns null for empty/garbage', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe('admin allowlist', () => {
  afterEach(() => { delete process.env.ADMIN_PHONES; });

  it('is empty when ADMIN_PHONES is unset', () => {
    expect(adminAllowlist()).toEqual([]);
    expect(isAllowedAdmin('+14155551234')).toBe(false);
  });

  it('normalizes entries and matches regardless of input format', () => {
    process.env.ADMIN_PHONES = '415-555-1234, +1 415 555 5678';
    expect(adminAllowlist()).toEqual(['+14155551234', '+14155555678']);
    expect(isAllowedAdmin('+14155551234')).toBe(true);
    expect(isAllowedAdmin('+14155555678')).toBe(true);
    expect(isAllowedAdmin('+19999999999')).toBe(false);
    expect(isAllowedAdmin(null)).toBe(false);
  });
});
