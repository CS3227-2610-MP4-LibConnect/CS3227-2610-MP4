import { defineConfig, devices } from '@playwright/test';

const env = process.env;
if (env.CODECLINIC_FIRESTORE_MODE !== 'local-emulator' ||
    env.CODECLINIC_FIRESTORE_PROJECT_ID !== 'demo-codeclinic' ||
    env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
    (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== 'demo-codeclinic')) {
  throw new Error('Playwright requires the demo-codeclinic Firestore emulator at 127.0.0.1:8080.');
}

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: require.resolve('./test/e2e/playwright-server.cjs'),
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
