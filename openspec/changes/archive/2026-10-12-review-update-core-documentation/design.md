# Design

## Context

See proposal.md for why. What matters for how:

- **PLAN.md section numbers are a public interface.** README, both CLAUDE.md files,
  `documentation/docs/overview.md`, four feature documents and the archived `_specs/`/`_plans/`
  pair link to `PLAN.md §1`–`§5` and to the anchor `PLAN.md#4-фичи`.
- **Some documents restate PLAN.md.** `CLAUDE.md` (decisions table), `src-tauri/CLAUDE.md` (Config
  and state) and `documentation/docs/features/07-app-config.md` all say "PLAN.md §2 names
  `tauri-plugin-store`". Once §2 is corrected, those sentences become false unless they are reworded.
- **The wrong tray log text is in two places:** `src-tauri/src/tray.rs` (module doc, line 7–8, and
  the `log::error!` at line 86) and `documentation/docs/features/01-tray-icon.md:90`.
- **Verified facts** the rewrite relies on: 42 unit + 15 integration Rust tests and 14 UI tests
  (counted); `ui/public/favicon.svg` is referenced by `ui/index.html`, while `ui/src/assets/hero.png`,
  `react.svg`, `vite.svg` and `ui/public/icons.svg` are referenced nowhere in `ui/src`, `index.html`
  or `vite.config.ts`; the v1 Jira client requires `JIRA_CLOUD_ID` and calls
  `https://api.atlassian.com/ex/jira/{cloudId}`.
- **One fact is not verified:** how mature `tauri-plugin-wdio-webdriver` and
  `@crabnebula/tauri-driver` are for macOS e2e. Current WebdriverIO and Tauri docs list both.

## Goals / Non-Goals

**Goals:**
- Every statement in the touched documents is either true of the code today or clearly marked as
  planned.
- No inbound link or `§` reference breaks.
- Each kind of fact has one owning document, and the others link to it instead of paraphrasing it.

**Non-Goals:**
- Editing `_specs/` and `_plans/`. They are history: they describe what was planned at the time,
  including the reversed `tauri-plugin-store` choice, and stay as written.
- Rewriting `functional-checklist.md` or `performance.md`. They record dated measurements and passes.
- Detailing the time-tracking feature beyond a draft. It needs its own change once the tracker's
  integration method is known.

## Decisions

### 1. Keep PLAN.md's §1–§5 meanings, append §6 for testing

§1 Goals, §2 Stack, §3 Modules, §4 Features (heading text stays exactly `## 4. Фичи` so the
`#4-фичи` anchor survives), §5 Open questions. The new testing strategy becomes **§6**.

*Alternative considered:* renumber to put testing next to the stack. Rejected: about a dozen links
in five documents would need editing, and a link that gets missed breaks silently.

### 2. One owner per kind of fact

| Fact | Owner | Others |
|---|---|---|
| Goals, priorities, backlog, open questions, testing strategy | PLAN.md (Russian) | link to it |
| Decisions taken and conventions | CLAUDE.md | link to it |
| Running, configuring, debugging | README.md | link to it |
| What is implemented and how it behaves | `documentation/` | link to it |
| Backend how-to | `src-tauri/CLAUDE.md` | — |

In practice: CLAUDE.md's stack table keeps a one-word **Status** column, but its rationale lives in
PLAN.md. README's intro is a short paragraph plus a link, not a second goal list. Test counts stay
where they already are (README table, overview, both CLAUDE.md files). They are accurate today, and
deduplicating them is not worth the churn in this change.

### 3. Reword "PLAN.md §2 names X" to the history it describes

`CLAUDE.md`, `src-tauri/CLAUDE.md` and `07-app-config.md` change to "PLAN.md §2 originally named
`tauri-plugin-store`". The decisions table's **Instead of** column already reads as history, so only
its parenthetical changes.

*Alternative considered:* leave `tauri-plugin-store` in PLAN.md with a strike-through. Rejected:
PLAN.md should state the current plan, and the decision record belongs in CLAUDE.md, which already
has one.

### 4. Status vocabulary for goals and backlog

Each item in PLAN.md §4 carries one of these: **готово** (done, checkbox ticked), **MVP**,
**черновик** (draft: direction agreed, details open; time tracking), **позже** (later; LLM reports).
README and CLAUDE.md use the English equivalents (done / MVP / draft / later). This is what stops a
document from implying that a draft feature is planned in detail.

### 5. Testing strategy is written as a rule plus a layer table, not as a tool commitment

PLAN.md §6 states the rule: every feature ships with unit tests, plus automated e2e where it has UI
or cross-process behaviour. Live systems are touched only manually, through a dry-run mode, and
never from CI. A layer table follows: Rust pure logic → `cargo test`; HTTP clients → mock server
(`wiremock`); page objects → Playwright against a local HTML fixture; UI → vitest + RTL; UI flows →
Playwright + vite + `mockIPC`; app e2e → WebdriverIO with a macOS-capable driver.

The app e2e driver is written as **"to evaluate: `tauri-plugin-wdio-webdriver` or
`@crabnebula/tauri-driver`"**, not as a decision, because its maturity is unverified (see Context).
CLAUDE.md's convention changes from "live window → manual checklist" to "automate by default; the
checklist is for what needs eyes, the menu bar, or a reboot".

### 6. QA Portal stays browser-driven; Jira moves to Rust — recorded as decisions

Both go into CLAUDE.md's decisions table and PLAN.md §2/§3:

- **QA Portal:** the portal computes its parameters in its frontend, so there is no API to call.
- **Jira:** browser automation is not needed for Jira; Rust gives pure, testable grouping and keeps
  the sidecar thin and short-lived.

Sidecar packaging (Node + Chromium) becomes a §5 open question, and the sidecar change has to
answer it.

### 7. Code edits limited to comments, log text and scaffold metadata

- `tray.rs`: the doc and the log say that without a tray, closing the window **quits the app**.
- `autostart.rs`: the plist is named by `productName`.
- `Cargo.toml`: `description` and `authors` filled in.
- Unused Vite assets and `ui/README.md` removed.

The four behavioural findings go into PLAN.md §4 as backlog items, so each gets its own change with
tests: duplicate `apply()`, `hide_main_window`'s `if`, release logging, and CSP.

## Risks / Trade-offs

- **[A `§`/anchor reference breaks]** → Decision 1. In addition, the final task greps every
  `PLAN.md§`/`PLAN.md#` reference and checks each one against the new headings.
- **[Removing a UI asset breaks the build]** → Only grep-verified unreferenced files are removed;
  `npm run build` and `npm test` in `ui/` must pass afterwards.
- **[The log string change hides a test dependency]** → Grep shows no test asserts it. `cargo test`
  must still report 57 passed. README's log table quotes only the prefix (`could not create the tray
  icon: … Hide-to-tray is disabled`), which stays.
- **[The documents restate an unverified e2e tool as fact]** → Decision 5 marks it "to evaluate".
- **[Russian/English drift]** → PLAN.md stays Russian; everything else stays English. Code
  identifiers stay as code in both.

## Migration Plan

Not applicable: documentation only. Rollback is `git revert`.
