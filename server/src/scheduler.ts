// In-process daily digest scheduler. The web service runs a single instance
// (the SQLite volume can only attach to one service), so scheduling here is
// safe — no risk of multiple replicas double-sending.
//
// Uses a native timer instead of a cron library. We only support the daily
// crontab form "M H * * *" (minute, hour, then three literal "*" fields),
// interpreted in UTC, for continuity with the previous DIGEST_CRON config.
import { getDb } from './db.js';
import { sendDigest } from './digest.js';

// Default: 14:00 UTC daily. Override with DIGEST_CRON (a UTC crontab expression).
const DEFAULT_CRON = '0 14 * * *';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A handle for stopping the schedule. */
export interface DigestSchedule {
  stop(): void;
}

/**
 * Start the daily digest schedule, if configured. Returns a handle with a
 * stop() method, or null when nothing was scheduled (no Postmark token, or an
 * invalid expression). Sending itself still no-ops unless DIGEST_FROM/DIGEST_TO
 * are also set — but with no token there's no point spinning up a timer at all.
 */
export function startDigestSchedule(): DigestSchedule | null {
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    console.log('[digest] not scheduled: POSTMARK_SERVER_TOKEN is not set');
    return null;
  }

  const expr = process.env.DIGEST_CRON || DEFAULT_CRON;
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    console.error(`[digest] not scheduled: invalid DIGEST_CRON "${expr}"`);
    return null;
  }

  const minute = Number(fields[0]);
  const hour = Number(fields[1]);
  const restAllStars = fields[2] === '*' && fields[3] === '*' && fields[4] === '*';
  const valid =
    restAllStars &&
    Number.isInteger(minute) && minute >= 0 && minute <= 59 &&
    Number.isInteger(hour) && hour >= 0 && hour <= 23;

  if (!valid) {
    console.error(`[digest] not scheduled: invalid DIGEST_CRON "${expr}"`);
    return null;
  }

  const fire = async (): Promise<void> => {
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
  };

  // Next occurrence of hour:minute in UTC.
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0,
  ));
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY_MS);

  let intervalTimer: ReturnType<typeof setInterval> | null = null;

  const initialTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
    void fire();
    intervalTimer = setInterval(() => { void fire(); }, DAY_MS);
    intervalTimer.unref?.();
  }, next.getTime() - now.getTime());
  initialTimer.unref?.();

  const hh = hour.toString().padStart(2, '0');
  const mm = minute.toString().padStart(2, '0');
  console.log(`[digest] scheduled: "${expr}" (UTC, daily at ${hh}:${mm})`);

  return {
    stop(): void {
      clearTimeout(initialTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    },
  };
}
