# SYS-010 — [System][Test build] A killed run left a login item behind -> the next run removes it before its first spec

| | |
|---|---|
| Status | `manual` |
| Levels | e2e, manual |
| Module | [`e2e/support/clean.ts`](../../../../e2e/support/clean.ts) |
| Feature | [Overview](../../../docs/overview.md) |

## Purpose

A run killed after the test build registered its login item would otherwise leave the debug bundle starting at every login. The harness cleans before WebdriverIO starts; this shows it does.

## Preconditions

- The test build exists: `npm run build:e2e`.
- The prerequisites are met: `npm run test:doctor` is all green.

## Steps

1. Plant a stale login item: `mkdir -p ~/Library/LaunchAgents && printf '<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>Label</key><string>jira-to-qa-portal-e2e</string><key>RunAtLoad</key><true/></dict></plist>' > ~/Library/LaunchAgents/jira-to-qa-portal-e2e.plist`.
2. Plant a stale config: `mkdir -p ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal.e2e && echo '{"autostart_enabled": true}' > ~/Library/Application\ Support/dev.sazonau.jira-to-qa-portal.e2e/app-config.json`.
3. Run `npm run test:e2e -- --spec ./specs/login-item.e2e.ts`.
4. Run `ls ~/Library/LaunchAgents | grep -i qa-portal-e2e`.

## Expected result

- LOGIN-001 passes: the first launch sees a fresh install — no login item, toggle off — so the stale plist and config were removed before it.
- After the run, `ls` finds no test-build plist.

## Automated by

Nothing yet.

## Why manual

It needs a deliberately planted leftover, which no spec should create on its own. It reuses LOGIN-001 as the probe.

## Related

- Feature: [Overview](../../../docs/overview.md)
- Module: [`e2e/support/clean.ts`](../../../../e2e/support/clean.ts)
- Catalog: [SYS-010](../../catalog.md)
