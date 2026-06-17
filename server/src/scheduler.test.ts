import { describe, it, expect, afterEach } from 'vitest';
import { startDigestSchedule } from './scheduler.js';

describe('startDigestSchedule()', () => {
  afterEach(() => {
    delete process.env.POSTMARK_SERVER_TOKEN;
    delete process.env.DIGEST_CRON;
  });

  it('does not schedule without a Postmark token', () => {
    delete process.env.POSTMARK_SERVER_TOKEN;
    expect(startDigestSchedule()).toBeNull();
  });

  it('schedules for a valid daily cron and returns a stoppable handle', () => {
    process.env.POSTMARK_SERVER_TOKEN = 'x';
    process.env.DIGEST_CRON = '30 9 * * *';
    const handle = startDigestSchedule();
    expect(handle).not.toBeNull();
    expect(typeof handle!.stop).toBe('function');
    handle!.stop(); // clear the armed timer
  });

  it('refuses non-daily / malformed expressions', () => {
    process.env.POSTMARK_SERVER_TOKEN = 'x';
    for (const expr of ['*/5 * * * *', '0 14 * * 1', '0 99 * * *', 'nonsense']) {
      process.env.DIGEST_CRON = expr;
      expect(startDigestSchedule(), expr).toBeNull();
    }
  });
});
