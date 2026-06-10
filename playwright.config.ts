import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import path from 'path';

const PORT = process.env.E2E_PORT ?? '3100';
const baseURL = `http://localhost:${PORT}`;

// Run each e2e invocation against a fresh throwaway DB so tests are isolated
// from dev/seed data and from each other across runs.
const E2E_DB_PATH = path.join(os.tmpdir(), `nps-e2e-${Date.now()}.db`);

// Allow reusing a locally-installed Chromium (e.g. via gstack) when Playwright's
// own browser download is unavailable. Ignored when empty.
const executablePath = process.env.GSTACK_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Boot the real production server (API + built client) for the test run.
  webServer: {
    command: 'node server/dist/index.js',
    url: baseURL,
    env: { PORT, NODE_ENV: 'production', NPS_DB_PATH: E2E_DB_PATH },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
