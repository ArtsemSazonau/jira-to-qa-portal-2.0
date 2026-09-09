# Legacy script (reference only)

Снимок консольного Playwright-скрипта v1.0 (репозиторий `qa-portal-jira`), из которого
переносится sync-логика в `sidecar/` по [`PLAN.md`](../../PLAN.md).

Не является частью сборки v2.0 — оригинальная структура сохранена как есть, для сверки
логики при портировании в sidecar-режим (без Playwright test-раннера).

Оригинальный README проекта — [`ORIGINAL-README.md`](./ORIGINAL-README.md).

- `helpers/jiraClient.ts` — клиент Jira REST API
- `page_objects/QAPortalQualityTracker.ts` — page object для QA Portal (Playwright)
- `data/{jiraData,platformMapping,priorityMapping}.ts` — маппинги платформ/приоритетов
- `tests/sync-jira-qa-portal.spec.ts` — текущий Playwright-тест, оркестрирующий синк
