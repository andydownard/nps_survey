# nps_survey

A small Net Promoter Score (NPS) survey app for the Vibe Coding Bootcamp. A 3-step flow —
rate 0–10, leave an optional comment, then see the live cohort NPS and what people said.

## Stack

- **client/** — React + Vite + TypeScript (Tailwind available). The whole survey UI.
- **server/** — Express + `better-sqlite3`. REST API at `/api/responses` and, in
  production, serves the built client.
- **SQLite** — responses persist in `server/data/nps.db` (auto-created on first run, no
  seed/sample data — only real submissions). The data dir is gitignored.

## Develop

```bash
npm install            # root tooling (concurrently)
npm run dev            # client on :5173 (Vite), server on :3001; Vite proxies /api
```

## Test

```bash
npm test               # server (vitest) + client (vitest) unit/component tests
npm run test:e2e       # Playwright end-to-end test of the full survey flow
```

## Build & run (production)

```bash
npm run build          # installs sub-deps, compiles the server, builds the client
npm start              # serves API + built client on $PORT (default 3001)
```

The server serves the built client whenever `NODE_ENV` is not `development`, so a plain
`npm start` (or a Railway deploy) hosts the whole app from one process.

## Deploy

Pushes to `main` deploy to Railway. Railway runs `npm run build` then `npm start`; it sets
`PORT` automatically.

### Persisting data (Railway volume)

Railway's container filesystem is ephemeral, so without a volume the SQLite file resets on
every redeploy. To keep responses, attach a volume:

1. Railway dashboard → your service → **Variables/Settings → Volumes → New Volume**.
2. Mount path: `/data` (any path is fine).
3. Redeploy.

The server reads `RAILWAY_VOLUME_MOUNT_PATH` (which Railway sets automatically when a volume
is attached) and stores `nps.db` there — no extra config needed. You can also force a path
with the `NPS_DB_PATH` env var, which takes precedence.

## API

- `POST /api/responses` — body `{ score: 0–10, comment?: string }` → `{ id }`
- `GET  /api/responses?youId=<id>` → `{ responses, nps, total, counts }`
- `DELETE /api/responses` — wipe all responses (admin). Disabled unless the
  `ADMIN_TOKEN` env var is set; requires the token via `Authorization: Bearer <token>`
  or `?token=<token>`. Returns `{ deleted: <count> }`.
- `POST /api/digest/send` — send the daily NPS digest email on demand (admin; same
  `ADMIN_TOKEN` auth as above). Returns `{ skipped, reason }` or `{ skipped: false, messageIds }`.

### Wiping responses

Set an `ADMIN_TOKEN` env var on the service (Railway → Variables), then:

```bash
curl -X DELETE https://<your-app>/api/responses \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Without `ADMIN_TOKEN` set the endpoint stays disabled (403), so it can't be triggered by
default.

## Daily NPS digest email (Postmark)

The server can email a daily NPS report — yesterday's NPS, a 7-day trend, the
promoter/passive/detractor breakdown, detractor comments, and the top promoter quote.
Delivery uses [Postmark](https://postmarkapp.com); scheduling uses a Railway cron service.
Rendering lives in `server/src/digest.ts`; `server/src/send-digest.ts` is the cron entry.

### One-time Postmark setup

1. Create a Postmark **Server** and copy its **Server API Token**.
2. Verify a sender: a **domain** (DKIM + return-path DNS records) is recommended for a
   recurring digest; a single **Sender Signature** works to start.
3. Create a **Broadcast** message stream and note its ID (Postmark recommends sending
   reports/digests over a broadcast — not transactional — stream). Default used here is
   `broadcast`.

### Configuration (env vars on the service)

| Var | Required | Notes |
|-----|----------|-------|
| `POSTMARK_SERVER_TOKEN` | yes | Server API token. **Unset → sending is a no-op** (dev/tests never email). |
| `DIGEST_FROM` | yes | Verified from-address, e.g. `reports@yourdomain.com`. |
| `DIGEST_TO` | yes | Recipient(s), comma-separated. One message is sent per recipient. |
| `POSTMARK_MESSAGE_STREAM` | no | Defaults to `broadcast`. |
| `DASHBOARD_URL` | no | URL behind the "View full dashboard" button. |
| `DIGEST_COHORT` | no | Cohort name shown in the footer. |

### Sending

- **Scheduled:** add a Railway **Cron** service that runs `npm run digest` (which runs
  `node dist/send-digest.js`). Set the schedule to daily, e.g. `0 14 * * *` (14:00 UTC).
  Day boundaries are computed in UTC, so "yesterday" means the prior UTC calendar day.
- **On demand (test):** `POST /api/digest/send` with the `ADMIN_TOKEN` (see above) — handy
  for verifying Postmark config without waiting for cron.

```bash
curl -X POST https://<your-app>/api/digest/send \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
