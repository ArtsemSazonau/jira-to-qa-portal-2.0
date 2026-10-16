#!/usr/bin/env node
/**
 * Fails if the UI flows' mock backend reached the production frontend bundle.
 *
 *   node scripts/test/check-mock-leak.mjs [dist-dir]     default: ui/dist
 *
 * Run after `npm --prefix ui run build`. The mock is meant to be dropped statically
 * (`import.meta.env.MODE === 'mock'` in main.tsx); this checks the artefact rather than trusting it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const dist = path.resolve(process.argv[2] ?? path.join(root, 'ui/dist'))

/** Strings that exist only in ui/src/test/mock-backend.ts or in @tauri-apps/api/mocks. */
const MARKERS = ['qa-portal-mock-backend', '__MOCK_SCENARIO__', '__IPC_CALLS__', 'mockIPC']

if (!fs.existsSync(dist)) {
  console.error(`mock leak check: ${path.relative(root, dist)} does not exist; build the UI first`)
  process.exit(1)
}

const files = fs.readdirSync(dist, { recursive: true }).filter((f) => /\.(m?js|html)$/.test(f))
const leaks = []
for (const file of files) {
  const text = fs.readFileSync(path.join(dist, file), 'utf8')
  for (const marker of MARKERS) if (text.includes(marker)) leaks.push(`${file} contains "${marker}"`)
}

if (leaks.length) {
  console.error('mock leak check failed: the UI flows mock is in the production bundle')
  for (const leak of leaks) console.error(`  - ${leak}`)
  process.exit(1)
}
console.log(`mock leak check passed: ${files.length} files in ${path.relative(root, dist)}, no mock code`)
