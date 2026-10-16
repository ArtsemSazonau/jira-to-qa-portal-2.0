/**
 * Tests for the catalog checker. Each test copies the passing fixture tree in
 * `fixtures/catalog/` to a temp dir, breaks one thing, and asserts the checker names it.
 *
 *   node --test scripts/test
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { check, parseCatalog, scanJs, scanRust, scanShell } from './catalog.mjs'

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/catalog')

let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-check-'))
  fs.cpSync(FIXTURE, root, { recursive: true })
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

const file = (rel) => path.join(root, rel)
const edit = (rel, fn) => fs.writeFileSync(file(rel), fn(fs.readFileSync(file(rel), 'utf8')))
const errorsOf = (opts) => check(root, opts).errors

describe('catalog check', () => {
  it('passes on the fixture as committed', () => {
    assert.deepEqual(errorsOf(), [])
  })

  it('reports a claim without a test, naming the case', () => {
    edit('src-tauri/src/lib.rs', (s) => s.replace('// case: DEMO-001\n', ''))
    const errors = errorsOf({ write: true })
    assert.deepEqual(errors, ['claim without test: DEMO-001 is marked automated but no test carries its ID'])
  })

  it('reports a partial case with no test as a claim without a test', () => {
    edit('ui/src/panel.test.tsx', (s) => s.replace('[DEMO-002] ', ''))
    const errors = errorsOf({ write: true })
    assert.deepEqual(errors, ['claim without test: DEMO-002 is marked partial but no test carries its ID'])
  })

  it('reports an orphan tag in a JS test, naming the test and the ID', () => {
    edit('ui/src/panel.test.tsx', (s) => s.replace("it('renders", "it('[DEMO-999] renders"))
    const errors = errorsOf({ write: true })
    assert.deepEqual(errors, [
      'orphan tag: ui/src/panel.test.tsx › [DEMO-999] renders without crashing carries DEMO-999, which is not in the catalog',
    ])
  })

  it('reports an orphan tag in a Rust test', () => {
    edit('src-tauri/src/lib.rs', (s) => s.replace('    #[test]\n    fn a_helper', '    // case: DEMO-998\n    #[test]\n    fn a_helper'))
    const errors = errorsOf({ write: true })
    assert.deepEqual(errors, [
      'orphan tag: src-tauri/src/lib.rs › a_helper_level_check carries DEMO-998, which is not in the catalog',
    ])
  })

  it('reports a Rust case tag that is not attached to a test', () => {
    edit('src-tauri/src/lib.rs', (s) => s.replace('mod tests {', 'mod tests {\n    // case: DEMO-001\n    const X: u8 = 1;'))
    const errors = errorsOf({ write: true })
    assert.equal(errors.length, 1)
    assert.match(errors[0], /^orphan tag: src-tauri\/src\/lib\.rs:3 has a case line that is not directly above a test/)
  })

  it('reports a missing case file when the link points nowhere', () => {
    fs.rmSync(file('documentation/tests/cases/demo/DEMO-003-dark.md'))
    assert.deepEqual(errorsOf(), ['missing case file: DEMO-003 links cases/demo/DEMO-003-dark.md, which does not exist'])
  })

  it('reports a missing case file when a manual case has no link', () => {
    edit('documentation/tests/catalog.md', (s) => s.replace('[DEMO-003](cases/demo/DEMO-003-dark.md)', '—'))
    assert.deepEqual(errorsOf(), ['missing case file: DEMO-003 is manual [manual] and needs a case file'])
  })

  it('requires a case file for an e2e case even when it is automated', () => {
    edit('documentation/tests/catalog.md', (s) => s.replace('| unit | automated |', '| unit, e2e | automated |'))
    assert.deepEqual(errorsOf(), ['missing case file: DEMO-001 is automated [unit, e2e] and needs a case file'])
  })

  it('reports a stale inventory', () => {
    edit('ui/src/panel.test.tsx', (s) => `${s}it('a new untagged test', () => {})\n`)
    assert.deepEqual(errorsOf(), [
      'stale inventory: documentation/tests/inventory.md does not match the test sources; run `npm run test:catalog -- --write`',
    ])
  })

  it('--write regenerates the inventory so the next check passes', () => {
    edit('ui/src/panel.test.tsx', (s) => `${s}it('a new untagged test', () => {})\n`)
    assert.deepEqual(errorsOf({ write: true }), [])
    assert.deepEqual(errorsOf(), [])
    assert.match(fs.readFileSync(file('documentation/tests/inventory.md'), 'utf8'), /a new untagged test/)
  })

  it('reports a manual case that a test carries', () => {
    edit('ui/src/panel.test.tsx', (s) => s.replace("it('renders", "it('[DEMO-003] renders"))
    const errors = errorsOf({ write: true })
    assert.equal(errors.length, 1)
    assert.match(errors[0], /^under-claimed: DEMO-003 is marked manual but tests carry it/)
  })

  it('reports an unknown status and a malformed row', () => {
    edit('documentation/tests/catalog.md', (s) =>
      s.replace('| unit | planned |', '| unit | someday |').replace('| DEMO-001 |', '| DEMO-001 | extra |'),
    )
    const errors = errorsOf()
    assert.ok(errors.some((e) => e.startsWith('malformed row: catalog.md:7 has 8 columns')), errors.join('\n'))
    assert.ok(errors.includes('invalid status: DEMO-004 has "someday", expected one of automated, partial, manual, planned'))
  })
})

describe('parsers', () => {
  it('reads several IDs from one Rust tag and skips other attributes', () => {
    const { tests } = scanRust('// case: A-001, B-002\n#[ignore]\n#[test]\nfn both() {}\n', 'x.rs')
    assert.deepEqual(tests.map((t) => [t.name, t.cases]), [['both', ['A-001', 'B-002']]])
  })

  it('finds tests inside proptest! blocks', () => {
    const src = 'proptest! {\n    // case: A-001\n    #[test]\n    fn holds(x in 0..3u8) {}\n}\n'
    assert.deepEqual(scanRust(src, 'x.rs').tests.map((t) => [t.name, t.cases]), [['holds', ['A-001']]])
  })

  it('reads a shell step function and the case line above it', () => {
    const src = '# case: SYS-008\nstep_no_test_code() {\n  true\n}\nstep_helper() {\n}\n'
    assert.deepEqual(scanShell(src, 'x.sh').tests.map((t) => [t.name, t.cases]), [
      ['step_no_test_code', ['SYS-008']],
      ['step_helper', []],
    ])
    assert.deepEqual(scanShell('# case: SYS-008\nnot_a_step() {\n}\n', 'x.sh').dangling, ['x.sh:1'])
  })

  it('reads a bracketed ID list only as a title prefix', () => {
    const src = "it('[A-001, B-002] both', () => {})\ntest('mentions [A-001] later', () => {})\n"
    assert.deepEqual(scanJs(src, 'x.test.ts').tests.map((t) => t.cases), [['A-001', 'B-002'], []])
  })

  it('does not mistake [Area][Feature] names for IDs', () => {
    const { rows } = parseCatalog('| TRAY-001 | [OS tray][Icon] Launch -> icon | manual | manual | `tray.rs` | x | [f](a.md) |\n')
    assert.equal(rows[0].name, '[OS tray][Icon] Launch -> icon')
    assert.equal(rows[0].file, 'a.md')
  })
})
