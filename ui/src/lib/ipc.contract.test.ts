/// <reference types="node" />
/**
 * The IPC contract: the commands `ipc.ts` invokes and the commands Rust
 * registers must be the same set. A name changed on one side only compiles
 * fine on both and fails at runtime, in the built app — this makes it fail here.
 *
 * Both sides are read as text. `lib.rs` registers commands in two
 * `cfg`-gated `tauri::generate_handler![…]` lists — production, and the test
 * build's, which is production plus `e2e_*` commands. `ipc.ts` calls
 * `invoke<…>('name', …)`.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

const names = (list: string) =>
  list
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((path) => path.split('::').pop()!)

/** The handler lists in `lib.rs`, keyed by the `cfg` that gates them. */
function handlerLists(libRs: string): { production: string[][]; e2e: string[][]; ungated: string[][] } {
  const lists = { production: [] as string[][], e2e: [] as string[][], ungated: [] as string[][] }
  for (const match of libRs.matchAll(/(#\[cfg\(([^\]]*)\)\]\s*)?[^\n]*generate_handler!\[([\s\S]*?)\]/g)) {
    const cfg = match[2]?.replace(/\s+/g, '') ?? ''
    const key = cfg === 'not(feature="e2e")' ? 'production' : cfg === 'feature="e2e"' ? 'e2e' : 'ungated'
    lists[key].push(names(match[3]))
  }
  return lists
}

/** Every command name `ipc.ts` passes to `invoke`. */
function invokedNames(ipcTs: string): string[] {
  return [...ipcTs.matchAll(/invoke(?:<[^>]*>)?\(\s*['"]([a-z0-9_]+)['"]/g)].map((match) => match[1])
}

const sorted = (list: string[]) => [...new Set(list)].sort()

describe('IPC contract', () => {
  const lists = handlerLists(read('../../../src-tauri/src/lib.rs'))
  const invoked = invokedNames(read('./ipc.ts'))

  it('[IPC-003] has exactly one production list and one test-build list', () => {
    expect(lists.production).toHaveLength(1)
    expect(lists.e2e).toHaveLength(1)
    expect(lists.ungated).toEqual([])
  })

  it('[IPC-003] registers in Rust exactly the commands the UI invokes', () => {
    expect(sorted(lists.production[0])).toEqual(sorted(invoked))
  })

  it('[IPC-003] registers each command once', () => {
    for (const list of [...lists.production, ...lists.e2e]) expect(list).toEqual([...new Set(list)])
  })

  it('[IPC-004] the test build registers the production list plus e2e_* commands only', () => {
    const [production] = lists.production
    const [e2e] = lists.e2e
    expect(e2e.filter((name) => !name.startsWith('e2e_'))).toEqual(production)
    expect(production.filter((name) => name.startsWith('e2e_'))).toEqual([])
    expect(e2e.filter((name) => name.startsWith('e2e_')).length).toBeGreaterThan(0)
  })

  it('reads both sides the way the source writes them', () => {
    const lib = `
      #[cfg(not(feature = "e2e"))]
      let b = b.invoke_handler(tauri::generate_handler![a::one, two]);
      #[cfg(feature = "e2e")]
      let b = b.invoke_handler(tauri::generate_handler![
          a::one,
          two,
          e2e::e2e_x,
      ]);`
    expect(handlerLists(lib)).toEqual({ production: [['one', 'two']], e2e: [['one', 'two', 'e2e_x']], ungated: [] })
    expect(invokedNames("invoke<boolean>('get_x')\ninvoke<void>(\n  'set_y', { v })")).toEqual(['get_x', 'set_y'])
  })
})
