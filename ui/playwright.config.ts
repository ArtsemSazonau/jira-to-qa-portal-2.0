/**
 * UI flows: the real frontend in WebKit — the engine closest to the app's WKWebView — with the
 * backend replaced by scripted IPC responses (`src/test/mock-backend.ts`, loaded by `vite --mode
 * mock`). No Tauri, no bundle, no OS permission; anything that needs the real window is e2e's job.
 *
 *   npm run test:flows                       from the repo root
 *   npx playwright test --update-snapshots   from ui/, to approve new screenshot baselines
 */
import { defineConfig, devices } from '@playwright/test'

const MOCK_PORT = 1421
const PLAIN_PORT = 1422

export default defineConfig({
  testDir: './flows',
  testMatch: '**/*.flow.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Safari'],
    // The app window's default size, from tauri.conf.json.
    viewport: { width: 800, height: 600 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  expect: {
    // Baselines are per platform (the file name carries it), and renders on one machine are
    // normally pixel-identical, so the tolerance only absorbs stray anti-aliasing. It must stay
    // tight: the page is mostly white and the panel nearly so, so a layout shift changes only the
    // sparse text and border pixels. A 1% ratio (4,800 px) let a 28 → 40 px heading pass.
    toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.1 },
  },
  projects: [
    {
      name: 'webkit',
      testIgnore: '**/no-backend.flow.ts',
      use: { baseURL: `http://localhost:${MOCK_PORT}` },
    },
    {
      // Plain `vite`, no mock: what a browser sees with no Tauri backend at all.
      name: 'webkit-no-backend',
      testMatch: '**/no-backend.flow.ts',
      use: { baseURL: `http://localhost:${PLAIN_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --mode mock --port ${MOCK_PORT} --strictPort`,
      url: `http://localhost:${MOCK_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite --port ${PLAIN_PORT} --strictPort`,
      url: `http://localhost:${PLAIN_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
