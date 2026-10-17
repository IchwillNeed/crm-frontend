import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const python = process.env.CRM_TEST_PYTHON ?? '../crm_django/venv/Scripts/python.exe';
export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: { timeout: 30000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    launchOptions: existsSync(edge) ? { executablePath: edge } : {},
    screenshot: 'only-on-failure', trace: 'off',
  },
  webServer: [
    { command: `"${python}" ../crm_django/scripts/serve_e2e.py`, url: 'http://127.0.0.1:8001/health/', timeout: 120000, reuseExistingServer: false },
    { command: 'npm run build:e2e && npm run preview:e2e', url: 'http://127.0.0.1:5174', env: { VITE_API_URL: 'http://127.0.0.1:8001/api' }, timeout: 120000, reuseExistingServer: false },
  ],
});
