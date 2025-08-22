/**
 * Playwright configuration for end-to-end testing
 * Tests the Chrome extension in a real browser environment
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: 'https://www.linkedin.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false, // Run in headed mode to see extension UI
  },

  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Load the extension
        args: [
          '--disable-extensions-except=../../../', // Path to extension root
          '--load-extension=../../../', // Load our extension
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        // Set viewport for consistent testing
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),

  // Test timeout
  timeout: 30000,
  expect: {
    timeout: 5000
  },

  // Output directories
  outputDir: 'test-results/',
  
  // Web server for serving test pages
  webServer: {
    command: 'npm run serve:test-pages',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});