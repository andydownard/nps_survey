// In-process daily digest scheduler. The web service runs a single instance
// (the SQLite volume can only attach to one service), so scheduling here is
// safe — no risk of multiple replicas double-sending.
import cron from 'node-cron';
import { getDb } from './db.js';
import { sendDigest } from './digest.js';

// Default: 14:00 UTC daily. Override with DIGEST_CRON (a UTC crontab expression).
const DEFAULT_CRON = '0 14 * * *';

/**
 * Start the daily digest cron, if configured. Returns the scheduled task, or
 * null when nothing was scheduled (no Postmark token, or an invalid
 * expression). Sending itself still no-ops unless DIGEST_FROM/DIGEST_TO are
 * also set — but with no token there's no point spinning up a timer at all.
 */
export function startDigestSchedule(): cron.ScheduledTask | null {
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    console.log('[digest] not scheduled: POSTMARK_SERVER_TOKEN is not set');
    return null;
  }

  const expr = process.env.DIGEST_CRON || DEFAULT_CRON;
  if (!cron.validate(expr)) {
    console.error(`[digest] not scheduled: invalid DIGEST_CRON "${expr}"`);
    return null;
  }

  const task = cron.schedule(
    expr,
    async () => {
      try {
        const result = await sendDigest(getDb());
        console.log(
          result.skipped
            ? `[digest] skipped: ${result.reason}`
            : `[digest] sent ${result.messageIds?.length ?? 0} message(s)`,
        );
      } catch (err) {
        console.error('[digest] failed:', err);
      }
    },
    { timezone: 'UTC' },
  );

  console.log(`[digest] scheduled: "${expr}" (UTC)`);
  return task;
}
