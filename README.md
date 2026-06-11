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

### Wiping responses

Set an `ADMIN_TOKEN` env var on the service (Railway → Variables), then:

```bash
curl -X DELETE https://<your-app>/api/responses \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Without `ADMIN_TOKEN` set the endpoint stays disabled (403), so it can't be triggered by
default.
