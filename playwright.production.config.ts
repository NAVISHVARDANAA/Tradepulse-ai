import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.WEB_PRODUCTION_URL

if (!baseURL) {
  throw new Error('WEB_PRODUCTION_URL is required for production browser verification.')
}

const productionOrigin = new URL(baseURL)
if (productionOrigin.protocol !== 'https:') {
  throw new Error('Production browser verification requires an HTTPS origin.')
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'production-smoke.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-production-report' }]]
    : [['list']],
  use: {
    baseURL: productionOrigin.origin,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'production-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'production-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
