// CLI entry for the daily NPS digest. Railway Cron runs `npm run digest`
// (which calls `node dist/send-digest.js`). Opens the DB, sends, logs, exits.
import { getDb } from './db.js';
import { sendDigest } from './digest.js';

async function main() {
  const db = getDb();
  const result = await sendDigest(db);
  if (result.skipped) {
    console.log(`[digest] skipped: ${result.reason}`);
  } else {
    console.log(`[digest] sent ${result.messageIds?.length ?? 0} message(s): ${result.messageIds?.join(', ')}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[digest] failed:', err);
    process.exit(1);
  });
