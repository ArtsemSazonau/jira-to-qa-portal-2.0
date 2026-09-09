# QA Portal ⇄ Jira Sync — Desktop App (v2.0)

План перехода от консольного Playwright-скрипта к кроссплатформенному десктоп-приложению с UI, треем, планировщиком и генерацией отчётов через LLM.

## 1. Цели

- Убрать ручную правку `.env` — ввод и хранение кредов через UI + системный keychain.
- Кроссплатформенность: macOS, Windows (приоритет), Linux (low priority).
- Минимальная нагрузка на систему в фоне (idle) — допустимы всплески CPU/RAM только во время выполнения синка или генерации отчёта.
- Конфигурируемый запуск по расписанию (cron-подобный).
- Генерация отчёта о проделанной/предстоящей работе по тикетам Jira за период, с помощью локальной LLM (Ollama), с заделом на облачные провайдеры.

## 2. Технологический стек

| Слой | Технология | Назначение |
|---|---|---|
| Core / shell | **Tauri (Rust)** | жизненный цикл приложения, трей, планировщик, IPC с UI |
| UI | HTML/CSS/JS + Vite (React или Svelte) | настройки, статус, просмотр логов, экран отчётов |
| Автоматизация браузера (QA Portal) | **Node.js + Playwright (TS)**, упакован как Tauri sidecar-бинарник | переиспользует текущий код (`helpers/`, `page_objects/`, `data/`); запускается только на время синка |
| Jira REST API | `reqwest` (Rust, нативно) или через тот же Node sidecar | получение тикетов, фильтров, JQL-запросов за период |
| Планировщик | `tokio-cron-scheduler` (Rust) | конфигурируемые cron-задачи, минимальный оверхед в простое |
| Хранилище кредов | `keyring-rs` → системный keychain (Keychain / Credential Manager / Secret Service) | Jira API token, QA Portal login/password, LLM API key/endpoint |
| Конфиг приложения (не секреты) | `tauri-plugin-store` | расписание, платформенные маппинги, выбранный LLM-провайдер |
| Автозапуск | `tauri-plugin-autostart` | старт при логине пользователя вместо демона/сервиса ОС |
| Логи | `tracing` + файловый sink | лог-файл, окно просмотра логов из трея |
| LLM (локально, MVP) | **Ollama** (`localhost:11434` REST API) | генерация отчёта; сама модель не бандлится в приложение |
| LLM (облако, будущее) | Anthropic/OpenAI HTTP API за тем же интерфейсом `LLMProvider` | включается позже без переделки ядра |
| Сборка/дистрибуция | `tauri-cli` (`tauri build`) | `.dmg`/`.app` (mac), `.exe`/NSIS (win), AppImage/deb (linux, low priority) |

### Архитектурный принцип
Тяжёлые операции (браузерная автоматизация, инференс LLM) выносятся из вечно работающего ядра во внешние процессы, которые живут только на время задачи:
- **Sidecar Node/Playwright** — только во время шага "залогиниться и обновить QA Portal".
- **Ollama** — отдельный, самостоятельно управляемый пользователем процесс; приложение только шлёт HTTP-запросы.
Ядро Tauri в простое — только трей + спящий планировщик, без Chromium и без Node.

## 3. Структура модулей

new_version_2.0/
├── src-tauri/                         # Rust-ядро (Tauri)
│   ├── src/
│   │   ├── main.rs                    # инициализация, регистрация плагинов, трей
│   │   ├── tray.rs                    # меню трея: запустить сейчас / настройки / логи / выход
│   │   ├── scheduler.rs               # tokio-cron-scheduler, чтение расписания из store
│   │   ├── config.rs                  # чтение/запись несекретных настроек (tauri-plugin-store)
│   │   ├── credentials.rs             # обёртка над keyring-rs (get/set/delete секретов)
│   │   ├── jira/
│   │   │   ├── client.rs              # REST-клиент Jira (auth, filter, JQL search, пагинация)
│   │   │   └── models.rs              # типы issue/filter/priority
│   │   ├── sync/
│   │   │   ├── mod.rs                 # оркестрация: Jira → группировка → sidecar → QA Portal
│   │   │   └── sidecar_bridge.rs      # запуск/остановка Node-sidecar, обмен по stdin/stdout
│   │   ├── report/
│   │   │   ├── mod.rs                 # сборка отчёта: период → тикеты → промпт → LLM → текст
│   │   │   └── llm/
│   │   │       ├── provider.rs        # trait LLMProvider { generate(prompt) -> Result<String> }
│   │   │       └── ollama.rs          # реализация под Ollama REST API
│   │   └── ipc_commands.rs            # #[tauri::command] — мост Rust ↔ UI
│   └── tauri.conf.json
├── sidecar/                            # бывший корневой проект, адаптированный под sidecar-режим
│   ├── helpers/jiraClient.ts          # (опционально) остаётся, если Jira-логика временно на Node
│   ├── page_objects/QAPortalQualityTracker.ts
│   ├── data/{jiraData,platformMapping,priorityMapping}.ts
│   └── sync-runner.ts                 # CLI-обёртка без Playwright test-раннера: одна функция runSync()
├── ui/                                  # фронтенд (Vite + React/Svelte)
│   ├── src/
│   │   ├── views/
│   │   │   ├── Settings.tsx           # форма кредов Jira/QA Portal/LLM (пишет через IPC → keyring)
│   │   │   ├── Schedule.tsx           # настройка cron/интервала синка
│   │   │   ├── SyncStatus.tsx         # статус последнего/следующего запуска, лог
│   │   │   └── Report.tsx             # выбор периода, провайдер LLM, просмотр/экспорт отчёта
│   │   └── lib/ipc.ts                 # типизированные обёртки над invoke()
│   └── vite.config.ts
└── PLAN.md                             # этот файл



## 4. Фичи

### MVP (первая версия v2.0)
- [ ] Форма ввода и хранения кредов (Jira email/API token/cloud ID, QA Portal login/password) через системный keychain
- [ ] Ручной запуск синка из трея ("Запустить сейчас")
- [ ] Конфигурируемое расписание синка (cron-выражение или простой интервал)
- [ ] Сворачивание в трей, автозапуск при логине ОС
- [ ] Просмотр статуса последнего запуска и логов из трея
- [ ] Портирование текущей sync-логики (Jira fetch → группировка по платформам → QA Portal update) в sidecar-режим без Playwright test-раннера
- [ ] Получение тикетов Jira за произвольный период (JQL по датам)
- [ ] Генерация отчёта "сделано / в работе / планируется" через локальную LLM (Ollama), с выбором модели из установленных (`GET /api/tags`)
- [ ] Обработка отсутствия Ollama/модели — понятная ошибка в UI вместо падения

### Планируется после MVP
- [ ] Облачные LLM-провайдеры (Anthropic Claude, OpenAI) под тем же `LLMProvider`-интерфейсом
- [ ] Экспорт отчёта (Markdown/PDF/Confluence)
- [ ] Системные уведомления об успехе/ошибке синка
- [ ] Поддержка нескольких Jira-проектов/фильтров и нескольких QA Portal-инстансов
- [ ] Автообновление приложения (`tauri-plugin-updater`)
- [ ] История отчётов (локальная БД, например SQLite через `tauri-plugin-sql`)
- [ ] Полноценная поддержка Linux (сборка и тестирование AppImage/deb)
- [ ] Настраиваемые маппинги платформ/приоритетов через UI вместо правки TS-файлов

## 5. Открытые вопросы для дальнейшего планирования
- Оставлять ли Jira REST-логику на Node (в sidecar) или переписать на `reqwest` в Rust-ядре, раз для неё браузер не нужен — снизит частоту запуска sidecar только до шага с QA Portal.
- Формат хранения истории синков/отчётов (файл vs SQLite).
- Нужно ли шифровать несекретный конфиг (расписание, маппинги) или он может храниться как есть.
Сохраните это как new_version_2.0/PLAN.md.