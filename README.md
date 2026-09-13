# HRDesk

Локальная HR-система: учёт сотрудников, оргструктура, табель, кадровые документы и отчётность.
Работает в двух режимах — как настольное приложение (Tauri, Windows) и как веб-приложение с
локальным Express-бэкендом. Данные всегда хранятся локально в SQLite, без внешних сервисов.

## Стек

| Слой | Технологии |
|---|---|
| Фронтенд | React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router 7 |
| Состояние и данные | Zustand-стор (`src/store`), TanStack Table, React Hook Form + Zod |
| Настольное приложение | Tauri 2 (`@tauri-apps/plugin-sql` → SQLite) |
| Веб-режим | Express 4 + better-sqlite3, JWT, bcryptjs |
| Документы | docxtemplater + PizZip (DOCX), ExcelJS (XLSX), html2pdf.js (PDF) |
| Интерфейс | i18next: русский (по умолчанию), английский, туркменский |
| Тесты | Vitest (API), Playwright (e2e) |

## Архитектура доступа к данным

Единая точка входа — [src/data/index.ts](src/data/index.ts). Она определяет среду выполнения и
выбирает бэкенд:

- **В Tauri** (`__TAURI_INTERNALS__` в `window`) вызовы идут напрямую в локальную SQLite
  через [src/data/tauriDb.ts](src/data/tauriDb.ts).
- **В браузере** те же вызовы уходят по HTTP на `/api/*` к Express-серверу [server.ts](server.ts),
  который работает с той же схемой через [src/db/sqlite.ts](src/db/sqlite.ts).

Благодаря этому страницы не знают, в каком режиме они запущены, а бизнес-логика не дублируется.

## Быстрый старт

**Требования:** Node.js 18+. Для сборки настольного приложения дополнительно — Rust и
[системные зависимости Tauri](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run dev          # веб-режим: Express + Vite на http://localhost:3000
# или
npm run tauri:dev    # настольное приложение
```

При первом запуске база создаётся и наполняется автоматически. Учётная запись по умолчанию:

```
admin@global.tech / password123
```

> Это сид для разработки, заданный в [src/db/sqlite.ts](src/db/sqlite.ts). Смените пароль
> сразу после первого входа — в приложении есть форма смены пароля и сброс системы.

Переменные окружения необязательны — см. [.env.example](.env.example). Локальные значения
кладите в `.env.local`, он читается на старте сервера и приоритетнее `.env`; файлы `.env*`
в git не попадают. Настраиваются секрет JWT (`JWT_SECRET`), порт (`PORT`) и путь к базе
(`DB_PATH`).

## Структура проекта

```
src/
  pages/         19 страниц: Dashboard, Employees, OrgChart, Timesheet, Templates,
                 DocumentGenerator, Reports, Recruiting, Onboarding, Performance,
                 TimeOff, Movements, Archive, KnowledgeBase, CalendarView, Settings, …
  components/    Layout и формы сотрудника
  data/          слой доступа к данным (Tauri ↔ REST) и типы
  db/            схема SQLite и сид
  lib/           генерация DOCX / XLSX, утилиты
  locales/       ru, en, tk
  store/         клиентское состояние
server.ts        Express REST API для веб-режима
src-tauri/       Rust-обвязка Tauri, конфиг и иконки (сборка: NSIS + MSI)
tests/api/       Vitest: REST API
tests/e2e/       Playwright: сценарии в браузере
```

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | Express + отдача клиента, порт 3000 |
| `npm run dev:client` | Только Vite dev-сервер (порт 5173) |
| `npm run build` | Сборка клиента (Vite) и сервера (esbuild → `dist/server.cjs`) |
| `npm start` | Запуск собранного сервера |
| `npm run tauri:dev` | Настольное приложение в режиме разработки |
| `npm run tauri:build` | Сборка инсталлятора (NSIS, MSI) |
| `npm run lint` | Проверка типов `tsc --noEmit`, включая тесты |

## Проверка (тесты)

Всё проверяется одной командой:

```bash
npm run verify
```

Она последовательно прогоняет типы → сборку → API-тесты → e2e-обход всех страниц.

Отдельные шаги:

| Команда | Что проверяет |
|---|---|
| `npm run lint` | Типы TypeScript (`tsc --noEmit`), включая тесты |
| `npm run build` | Сборку клиента и сервера |
| `npm test` | Vitest: REST API — авторизация, смена пароля, CRUD сотрудников, оргструктуры, шаблонов, табеля, архива |
| `npm run test:watch` | То же в режиме watch |
| `npm run test:e2e` | Playwright: логин, обход всех 18 страниц + навигация по меню, отлов ошибок консоли и неуспешных запросов |
| `npm run test:e2e:ui` | Playwright в интерактивном режиме |

E2E поднимают отдельный сервер на изолированной базе, поэтому рабочие данные не затрагиваются.

## Документация

| Файл | Содержание |
|---|---|
| [TZ.md](TZ.md) | Техническое задание |
| [TZ_AUDIT.md](TZ_AUDIT.md) | Сверка реализации с ТЗ |
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | Отчёт по аудиту кода |
| [TEST_SCENARIO.md](TEST_SCENARIO.md) | Ручные тестовые сценарии |
| [BUILD_PROMPT.md](BUILD_PROMPT.md), [BUILD_PROMPT.v2.md](BUILD_PROMPT.v2.md) | Постановка для генерации приложения |
