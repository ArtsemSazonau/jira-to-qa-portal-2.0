import react from '@vitejs/plugin-react'
// `vitest/config` rather than `vite` so the `test` block below is typed. It
// re-exports Vite's own `defineConfig`, so `vite build` and `vite dev` are
// unaffected.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Rust has its own `cargo test`; this only ever runs the frontend.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
