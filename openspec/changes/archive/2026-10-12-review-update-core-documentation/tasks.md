# Tasks

## 1. PLAN.md (Russian; keep §1–§5 meanings and the `## 4. Фичи` heading — design Decision 1)

- [x] 1.1 Remove the trailing line "Сохраните это как new_version_2.0/PLAN.md." and verify `grep -n "new_version_2.0" PLAN.md` returns nothing
- [x] 1.2 Rewrite §1 Цели: the five goals in priority order (Jira → QA Portal sync; time entry + calendar review — черновик; GitHub Actions builds; credentials window; local LLM reports — позже), plus the cross-cutting goal "unit + e2e autotests for every feature"; platform priority macOS → Windows → Linux. Verify by reading §1 against proposal.md "What Changes"
- [x] 1.3 Rewrite §2 Стек: config = serde → JSON (no `tauri-plugin-store`); logging = `log` + `tauri-plugin-log` (debug-only today); Jira REST = `reqwest` in Rust; QA Portal = Playwright sidecar (portal computes parameters in its frontend, no API); add rows for time tracker client (API or Playwright — undecided), CI (GitHub Actions + `tauri-action`), and testing tools. Verify every row is either true of `src-tauri/Cargo.toml`/`ui/package.json` today or marked as planned
- [x] 1.4 Rewrite §3 Структура модулей as a fenced code block rooted at the repo, showing existing files (`lib.rs`, `lifecycle/{mod,policy,macos}.rs`, `tray.rs`, `autostart.rs`, `notify.rs`, `config.rs`, `ipc_commands.rs`, `ui/src/App.tsx`, `ui/src/lib/ipc.ts`) separately from planned ones (scheduler, credentials, jira/, sync/, timesheet/, report/, sidecar/, `.github/workflows/`, UI views incl. Credentials and Timesheet calendar). Verify the "existing" half matches `git ls-files src-tauri/src ui/src` and the block renders as code in Markdown preview
- [x] 1.5 Rewrite §4 Фичи by goal with the status vocabulary (готово / MVP / черновик / позже): tick done lifecycle items; MVP = credentials window, Jira client in Rust, QA Portal sidecar sync, manual "run now", schedule, sync status + logs, CI build workflow; черновик = time tracking (template hours, calendar for exceptions, draft → review → submit, read-back to avoid duplicates); позже = LLM reports, cloud LLM, export; keep the existing "destroy window on close" item; add backlog items from review: release logging, strict CSP before the credentials window, deduplicate `apply()` (`lib.rs` vs `ipc_commands.rs`), `Trigger::HideRequested` instead of the `if` in `hide_main_window`, `AppConfig: Copy` redesign when string fields arrive, bundle `targets`/android cleanup. Verify heading is exactly `## 4. Фичи`
- [x] 1.6 Rewrite §5 Открытые вопросы: drop the answered Jira Rust-vs-Node question (now a decision); add time tracker integration method (API vs Playwright — check its network requests first), local storage for timesheet drafts (SQLite likely), sidecar packaging (Node runtime + Chromium size; bundled vs system Chrome vs first-run download), code signing / Apple Developer ID (Gatekeeper and keychain re-prompts on unsigned rebuilds), GitHub Actions macOS-minute cost if the repo is private. Verify each question names what it blocks
- [x] 1.7 Add §6 Стратегия тестирования per design Decision 5: the rule, the layer table, dry-run mode for live systems, "CI never writes to real systems", app-e2e driver marked "оценить: `tauri-plugin-wdio-webdriver` или `@crabnebula/tauri-driver`". Verify no tool is stated as chosen that design.md marks as "to evaluate"

## 2. CLAUDE.md (root)

- [x] 2.1 Update the intro "What exists / What does not" and the "What v2.0 is planned to be" paragraph to the new goals, linking to PLAN.md §1 rather than restating them; verify no goal list duplicates PLAN.md beyond one line each
- [x] 2.2 Fix "Key files" note on `jiraClient.ts`: Basic auth (email + API token) via `api.atlassian.com/ex/jira/{cloudId}`, cloudId required; verify against `reference/legacy-script/helpers/jiraClient.ts:15-27`
- [x] 2.3 Update the stack table: Jira REST → `reqwest` (Rust) decided; add time tracker (draft), credentials window, CI rows; LLM status "later"; replace "(open question, see PLAN.md §5)" accordingly. Verify each Status cell is one of done / MVP / draft / later / not started
- [x] 2.4 Add decisions to the "Decisions made during implementation" table: QA Portal stays browser-driven (frontend-computed parameters, no API); Jira in Rust; OpenSpec replaces `_specs/`/`_plans/`. Reword the `tauri-plugin-store` row's parenthetical to "originally PLAN.md §2". Verify table renders (column count consistent)
- [x] 2.5 Update Conventions: tests convention becomes "every feature ships unit tests, plus automated e2e where it has UI or cross-process behaviour; the manual checklist is for what needs eyes, the menu bar or a reboot; live systems only via dry-run, never from CI". Verify it no longer says live-window behaviour must go to the manual checklist
- [x] 2.6 Replace the "Spec and plan workflow" section: OpenSpec under `openspec/` (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`); `_specs/` and `_plans/` kept as history of the lifecycle feature. Verify the commands listed exist in `.claude/commands/opsx/`

## 3. README.md

- [x] 3.1 Rewrite the intro paragraph and "Current state" to the new goals (sync, time tracking draft, CI, credentials, LLM later) with a link to PLAN.md §1/§4; verify architecture, testing table (57/14) and configuration sections are unchanged
- [x] 3.2 Update "Planned but not yet built" under the architecture diagram (sidecar, Jira client in Rust, scheduler, keychain credentials window, time tracker, CI; LLM later) and the "Nothing runs these on its own" paragraph to point at PLAN.md §6 for the planned CI and e2e layers without claiming they exist; verify with `grep -n "\.github" README.md` that nothing claims a workflow exists

## 4. src-tauri/CLAUDE.md and documentation/

- [x] 4.1 `src-tauri/CLAUDE.md`: reword "deviation from PLAN.md §2, which names `tauri-plugin-store`" to "originally named"; update the Tests section intro so live-window behaviour points to automated e2e first (PLAN.md §6) and the checklist second; update the top paragraph's list of future modules (scheduler, Jira client, sidecar bridge, timesheet, credentials; LLM later). Verify by reading the file top to bottom
- [x] 4.2 `documentation/tests/automation-notes.md`: remove "a corrupt file, a file with unknown fields" from the config.rs gaps (verify against `config.rs` tests `a_corrupt_file_…` and `unknown_and_missing_keys_…`); replace the "no macOS support" constraint in §3 with the current options (`tauri-plugin-wdio-webdriver`, `@crabnebula/tauri-driver`, to evaluate); fix §5 CI "everything else runs anywhere" → a macOS runner is needed because `tray.rs` and `lifecycle/macos.rs` only compile on macOS
- [x] 4.3 `documentation/docs/overview.md`: "Not implemented yet" follows the new goal order (credentials, Jira client, QA Portal sidecar, scheduler + run now + status/logs, CI, time tracking draft, LLM later); verify the `PLAN.md#4-фичи` link still resolves
- [x] 4.4 `documentation/docs/features/07-app-config.md`: reword "PLAN.md §2 names `tauri-plugin-store`" to "originally named"; `01-tray-icon.md:90`: the no-tray fallback quits the app rather than "the window will close normally". Verify `grep -rn "close normally" documentation src-tauri` returns nothing

## 5. Code comments, log text and scaffold metadata (no behaviour change)

- [x] 5.1 `src-tauri/src/tray.rs`: fix the module doc (lines 3–8) and the `log::error!` text (line 84–87) to say that without a tray, closing the window quits the app; keep the prefix `could not create the tray icon: … Hide-to-tray is disabled` that README's log table quotes. Verify `cargo test` (run in a real terminal or with the seeded `CARGO_HOME`, per CLAUDE.md) reports 57 passed and `cargo clippy --all-targets -- -D warnings` is clean
- [x] 5.2 `src-tauri/src/autostart.rs:4`: plist is `~/Library/LaunchAgents/<productName>.plist` (`jira-to-qa-portal.plist`), not `<bundle-id>`; verify consistency with README "Launch at login"
- [x] 5.3 `src-tauri/Cargo.toml`: replace `description = "A Tauri App"` and `authors = ["you"]` with real values; verify `cargo check` passes (same terminal caveat as 5.1)
- [x] 5.4 Remove unreferenced scaffold files: `ui/README.md`, `ui/src/assets/hero.png`, `ui/src/assets/react.svg`, `ui/src/assets/vite.svg`, `ui/public/icons.svg` (keep `ui/public/favicon.svg`, used by `ui/index.html`). Re-grep for references first; verify `cd ui && npm test && npm run build && npm run lint` all pass

## 6. Integration checks

- [x] 6.1 Grep every `PLAN.md §` and `PLAN.md#` reference outside `_specs/`, `_plans/` and `openspec/` and confirm each still points at a section with the meaning it expects (design Decision 1); verify no reference to a removed section remains
- [x] 6.2 Run the full suite from README "Testing" and confirm "=== all green ===" with 57 Rust and 14 UI tests
- [x] 6.3 Cross-read README, CLAUDE.md and PLAN.md for contradictions on platform priority, goal order, config storage, Jira auth and testing convention; verify all three agree

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
