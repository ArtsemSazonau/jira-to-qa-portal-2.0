#!/usr/bin/env node
/**
 * Keeps documentation/tests/catalog.md honest against the code.
 *
 *   node scripts/test/catalog.mjs            check; exit 1 on any problem
 *   node scripts/test/catalog.mjs --write    regenerate inventory.md, then check
 *   node scripts/test/catalog.mjs --root DIR run against another tree (the tests use fixtures)
 *
 * A test carries a case ID as a title prefix in vitest, Playwright and WebdriverIO
 * (`it('[UI-003] …')`, several as `[UI-003, UI-004]`), as a `// case: UI-003` line directly above
 * `#[test]` in Rust, whose test names cannot hold brackets, and as a `# case: SYS-008` line directly
 * above a `step_name() {` function in the stage scripts (`scripts/test/*.sh`).
 *
 * It fails on: a case marked automated/partial that no test carries; a tag whose ID is not in the
 * catalog; a case marked manual/planned that a test does carry; a missing case file; a malformed
 * row; and an inventory.md that differs from what --write would produce.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const CATALOG = 'documentation/tests/catalog.md'
export const INVENTORY = 'documentation/tests/inventory.md'

/** Where tests live, in the order the inventory lists them. */
export const SOURCES = [
  { dir: 'src-tauri/src', lang: 'rust', layer: 'unit (Rust)' },
  { dir: 'src-tauri/tests', lang: 'rust', layer: 'integration (Rust)' },
  { dir: 'ui/src', lang: 'js', layer: 'component (vitest)' },
  { dir: 'ui/flows', lang: 'js', layer: 'flow (Playwright)' },
  { dir: 'e2e/specs', lang: 'js', layer: 'e2e (WebdriverIO)' },
  { dir: 'scripts/test', lang: 'shell', layer: 'release smoke (shell)' },
]

export const STATUSES = ['automated', 'partial', 'manual', 'planned']
export const LEVELS = ['unit', 'component', 'flow', 'e2e', 'manual', 'perf']

const ID = '[A-Z]+-\\d{3}'
const ID_LIST = new RegExp(`^\\[(${ID}(?:\\s*,\\s*${ID})*)\\]`)
const JS_TEST_FILE = /\.(test|spec|flow|e2e)\.[cm]?[jt]sx?$/
const JS_TEST_CALL = /^\s*(?:it|test)(?:\.(?:only|skip|fixme|fail|concurrent))?\(\s*(['"`])(.+?)\1/
const RUST_CASE = new RegExp(`^\\s*//\\s*case:\\s*(${ID}(?:\\s*,\\s*${ID})*)\\s*$`)
const RUST_TEST_ATTR = /^\s*#\[test\]\s*$/
const RUST_ATTR = /^\s*#\[.*\]\s*$/
const RUST_FN = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-z_][a-z0-9_]*)/
const SHELL_CASE = new RegExp(`^\\s*#\\s*case:\\s*(${ID}(?:\\s*,\\s*${ID})*)\\s*$`)
const SHELL_STEP = /^\s*(step_[a-z0-9_]+)\s*\(\)\s*\{/

const splitIds = (s) => s.split(',').map((id) => id.trim())

/** Parse every case row out of the catalog. Rows are table lines whose first cell is an ID. */
export function parseCatalog(text) {
  const rows = []
  const errors = []
  text.split('\n').forEach((line, index) => {
    const match = line.match(new RegExp(`^\\|\\s*(${ID})\\s*\\|`))
    if (!match) return
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    const where = `catalog.md:${index + 1}`
    if (cells.length !== 7) {
      errors.push(`malformed row: ${where} has ${cells.length} columns, expected 7 (ID | Case | Levels | Status | Module | Feature | File)`)
      return
    }
    const [id, name, levels, status, module, feature, file] = cells
    const link = file.match(/\]\(([^)]+)\)/)
    rows.push({
      id,
      name,
      levels: levels.split(',').map((level) => level.trim()).filter(Boolean),
      status,
      module,
      feature,
      file: link ? link[1] : null,
      line: index + 1,
    })
  })
  return { rows, errors }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full)
      return [full]
    })
}

/** Rust: every `#[test]` fn, with the IDs of the `// case:` lines directly above it. */
export function scanRust(text, file) {
  const lines = text.split('\n')
  const tests = []
  const dangling = []
  const used = new Set()
  lines.forEach((line, i) => {
    if (!RUST_TEST_ATTR.test(line)) return
    const cases = []
    for (let j = i - 1; j >= 0; j--) {
      const tag = lines[j].match(RUST_CASE)
      if (tag) {
        cases.unshift(...splitIds(tag[1]))
        used.add(j)
      } else if (!RUST_ATTR.test(lines[j])) break
    }
    for (let k = i + 1; k < lines.length; k++) {
      const fn = lines[k].match(RUST_FN)
      if (fn) {
        tests.push({ file, name: fn[1], cases, line: k + 1 })
        break
      }
      if (!RUST_ATTR.test(lines[k]) && lines[k].trim() !== '') break
    }
  })
  lines.forEach((line, i) => {
    if (RUST_CASE.test(line) && !used.has(i)) dangling.push(`${file}:${i + 1}`)
  })
  return { tests, dangling }
}

/** Shell stage scripts: every `step_name() {` function, with the `# case:` line directly above it. */
export function scanShell(text, file) {
  const lines = text.split('\n')
  const tests = []
  const dangling = []
  lines.forEach((line, i) => {
    const tag = line.match(SHELL_CASE)
    const fn = line.match(SHELL_STEP)
    if (fn) {
      const above = i > 0 ? lines[i - 1].match(SHELL_CASE) : null
      tests.push({ file, name: fn[1], cases: above ? splitIds(above[1]) : [], line: i + 1 })
    } else if (tag && !(lines[i + 1] ?? '').match(SHELL_STEP)) {
      dangling.push(`${file}:${i + 1}`)
    }
  })
  return { tests, dangling }
}

/** JS/TS: every `it(…)` / `test(…)` whose title is a string literal. */
export function scanJs(text, file) {
  const tests = []
  text.split('\n').forEach((line, i) => {
    const call = line.match(JS_TEST_CALL)
    if (!call) return
    const title = call[2]
    const tag = title.match(ID_LIST)
    tests.push({ file, name: title, cases: tag ? splitIds(tag[1]) : [], line: i + 1 })
  })
  return { tests, dangling: [] }
}

/** Every automated test under the scanned directories, in inventory order. */
export function scanTests(root) {
  const tests = []
  const dangling = []
  for (const source of SOURCES) {
    for (const full of walk(path.join(root, source.dir))) {
      const file = path.relative(root, full).split(path.sep).join('/')
      let result
      if (source.lang === 'rust' && file.endsWith('.rs')) {
        result = scanRust(fs.readFileSync(full, 'utf8'), file)
      } else if (source.lang === 'js' && JS_TEST_FILE.test(file)) {
        result = scanJs(fs.readFileSync(full, 'utf8'), file)
      } else if (source.lang === 'shell' && file.endsWith('.sh')) {
        result = scanShell(fs.readFileSync(full, 'utf8'), file)
      } else continue
      tests.push(...result.tests.map((test) => ({ ...test, layer: source.layer })))
      dangling.push(...result.dangling)
    }
  }
  return { tests, dangling }
}

const escapeCell = (s) => s.replace(/\|/g, '\\|')

/** The generated inventory. Deterministic: no dates, no line numbers. */
export function renderInventory(tests) {
  const out = [
    '# Test inventory',
    '',
    '**Generated** by `npm run test:catalog -- --write` from the test sources. Do not edit by hand;',
    '`npm run test:catalog` fails when this file is out of date.',
    '',
    'Every automated test, the file it lives in, and the [catalog](catalog.md) case it carries. A test',
    'with no case is a helper-level check that does not map to a catalogued behaviour.',
    '',
    '| Layer | Tests | Carrying a case |',
    '|---|---|---|',
  ]
  for (const source of SOURCES) {
    const ofLayer = tests.filter((test) => test.layer === source.layer)
    out.push(`| ${source.layer} | ${ofLayer.length} | ${ofLayer.filter((t) => t.cases.length).length} |`)
  }
  out.push(`| **Total** | **${tests.length}** | **${tests.filter((t) => t.cases.length).length}** |`, '')

  const files = [...new Set(tests.map((test) => test.file))]
  for (const file of files) {
    const inFile = tests.filter((test) => test.file === file)
    out.push(`## \`${file}\``, '', `${inFile[0].layer}.`, '', '| Test | Cases |', '|---|---|')
    for (const test of inFile) {
      out.push(`| \`${escapeCell(test.name)}\` | ${test.cases.join(', ') || '—'} |`)
    }
    out.push('')
  }
  return out.join('\n')
}

/** Run every check. Returns `{ errors, summary }`; `write` regenerates the inventory first. */
export function check(root, { write = false } = {}) {
  const errors = []
  const catalogPath = path.join(root, CATALOG)
  if (!fs.existsSync(catalogPath)) return { errors: [`no catalog at ${CATALOG}`], summary: '' }

  const { rows, errors: parseErrors } = parseCatalog(fs.readFileSync(catalogPath, 'utf8'))
  errors.push(...parseErrors)
  const { tests, dangling } = scanTests(root)

  const byId = new Map()
  for (const row of rows) {
    if (byId.has(row.id)) errors.push(`duplicate case: ${row.id} appears on catalog.md:${byId.get(row.id).line} and :${row.line}`)
    byId.set(row.id, row)
    if (!STATUSES.includes(row.status)) {
      errors.push(`invalid status: ${row.id} has "${row.status}", expected one of ${STATUSES.join(', ')}`)
    }
    for (const level of row.levels) {
      if (!LEVELS.includes(level)) errors.push(`invalid level: ${row.id} has "${level}", expected one of ${LEVELS.join(', ')}`)
    }
    const needsFile =
      row.status === 'manual' || row.status === 'partial' || row.levels.includes('e2e') || row.levels.includes('perf')
    if (row.file) {
      const target = path.join(path.dirname(catalogPath), row.file)
      if (!fs.existsSync(target)) errors.push(`missing case file: ${row.id} links ${row.file}, which does not exist`)
    } else if (needsFile) {
      errors.push(`missing case file: ${row.id} is ${row.status} [${row.levels.join(', ')}] and needs a case file`)
    }
  }

  const carriers = new Map()
  for (const test of tests) {
    for (const id of test.cases) {
      if (!byId.has(id)) {
        errors.push(`orphan tag: ${test.file} › ${test.name} carries ${id}, which is not in the catalog`)
        continue
      }
      if (!carriers.has(id)) carriers.set(id, [])
      carriers.get(id).push(test)
    }
  }
  for (const where of dangling) errors.push(`orphan tag: ${where} has a case line that is not directly above a test`)

  for (const row of rows) {
    const carried = carriers.get(row.id) ?? []
    if ((row.status === 'automated' || row.status === 'partial') && carried.length === 0) {
      errors.push(`claim without test: ${row.id} is marked ${row.status} but no test carries its ID`)
    }
    if ((row.status === 'manual' || row.status === 'planned') && carried.length > 0) {
      const names = carried.map((test) => `${test.file} › ${test.name}`).join('; ')
      errors.push(`under-claimed: ${row.id} is marked ${row.status} but tests carry it (${names}); mark it partial or automated`)
    }
  }

  const inventoryPath = path.join(root, INVENTORY)
  const inventory = renderInventory(tests)
  if (write) {
    fs.writeFileSync(inventoryPath, inventory)
  } else {
    const current = fs.existsSync(inventoryPath) ? fs.readFileSync(inventoryPath, 'utf8') : null
    if (current !== inventory) {
      errors.push(`stale inventory: ${INVENTORY} does not match the test sources; run \`npm run test:catalog -- --write\``)
    }
  }

  const count = (status) => rows.filter((row) => row.status === status).length
  const summary =
    `catalog: ${rows.length} cases (${STATUSES.map((s) => `${count(s)} ${s}`).join(', ')}); ` +
    `tests: ${tests.length}, ${tests.filter((t) => t.cases.length).length} carrying a case`
  return { errors, summary }
}

function main(argv) {
  const write = argv.includes('--write')
  const rootFlag = argv.indexOf('--root')
  const root = rootFlag >= 0 ? path.resolve(argv[rootFlag + 1]) : path.resolve(fileURLToPath(import.meta.url), '../../..')
  const { errors, summary } = check(root, { write })
  if (write) console.log(`wrote ${INVENTORY}`)
  if (errors.length) {
    console.error(`catalog check failed (${errors.length}):`)
    for (const error of errors) console.error(`  - ${error}`)
    console.error(summary)
    return 1
  }
  console.log(`catalog check passed. ${summary}`)
  return 0
}

// `node --test` runs every module under a `test/` directory, this one included; only the CLI
// entry point should check the real tree.
const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isEntry && !process.env.NODE_TEST_CONTEXT) process.exitCode = main(process.argv.slice(2))
