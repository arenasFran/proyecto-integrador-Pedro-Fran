import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  retries: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'TEST_PORT=3001 TEST_FRONTEND_URL=http://localhost:5174 npx ts-node --project tsconfig.test.json tests/test-server.ts',
      cwd: '../backend-barber',
      port: 3001,
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: 'VITE_API_URL=http://localhost:3001 npm run dev -- --host localhost --port 5174',
      cwd: '.',
      port: 5174,
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
});
