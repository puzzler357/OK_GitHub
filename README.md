<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e8ceac13-64d1-4be5-9d87-4e6db284d5b7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

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

Перед первым запуском e2e нужно один раз скачать браузер:

```bash
npx playwright install chromium
```

### Изоляция данных

Тесты никогда не трогают рабочую `local-hr-docs.db`: путь к базе задаётся
переменной `DB_PATH`, и оба набора тестов поднимают собственную временную базу
в `tests/.tmp/`, засеянную данными по умолчанию. HTML-отчёт Playwright после
прогона лежит в `tests/.tmp/playwright-report/index.html`.

### Ручной сценарий

Автотесты проверяют, что экраны открываются и API отвечает. Правильность расчётов, сохранность данных и читаемость интерфейса проверяются вручную по сценарию [TEST_SCENARIO.md](TEST_SCENARIO.md) — 148 шагов на данных вымышленной организации, полное прохождение 90–120 минут.

### Что тесты НЕ покрывают

Нативную сборку (Tauri) — там данные идут не через Express, а напрямую в SQLite
через `src/data/tauriDb.ts`. Её по-прежнему нужно проверять руками:
`npm run tauri:dev`.
