import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for SSVM ERP
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/.worktrees/**'],
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use */
  reporter: 'list',
  /* Shared settings */
  use: {
    baseURL: process.env.ERP_ADMIN_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },

  /* Configure projects */
  projects: [
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
