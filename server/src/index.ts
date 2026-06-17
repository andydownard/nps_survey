import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { responsesRouter } from './routes/responses.js';
import { digestRouter } from './routes/digest.js';
import { getDb } from './db.js';
import { startDigestSchedule } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
// In dev the client is served by Vite (5173) and proxies /api here.
// Anywhere else (Railway, `npm start`) the server also serves the built client.
const IS_DEV = process.env.NODE_ENV === 'development';

const app = express();
app.use(express.json());

if (IS_DEV) {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

// Initialize DB at startup
getDb();

app.use('/api/responses', responsesRouter);
app.use('/api/digest', digestRouter);

if (!IS_DEV) {
  const distPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  // Schedule the daily digest in the running web process (skipped in dev).
  if (!IS_DEV) startDigestSchedule();
});
