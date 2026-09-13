import type { Page } from '@playwright/test';

/**
 * Шум, который не считается поломкой страницы:
 * подсказки React/Vite и запрос фавиконки, которой в проекте нет.
 */
const IGNORED = [
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /\[vite\]/i,
  /React Router Future Flag Warning/i,
  // HMR-сокет dev-сервера: инфраструктура vite, а не код приложения.
  /WebSocket closed without opened/i,
  /ws:\/\/[^\s]*:24678/i,
];

const isNoise = (text: string) => IGNORED.some((re) => re.test(text));

export interface PageProblems {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
}

/**
 * Подписывается на ошибки консоли, необработанные исключения и неуспешные
 * сетевые ответы. Возвращает накапливаемый объект — читать после навигации.
 */
export function watchForProblems(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], pageErrors: [], failedRequests: [] };

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isNoise(text)) return;
    problems.consoleErrors.push(text);
  });

  page.on('pageerror', (err) => {
    if (isNoise(err.message)) return;
    problems.pageErrors.push(`${err.name}: ${err.message}`);
  });

  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (isNoise(url)) return;
    failedRequestPush(problems, res.status(), res.request().method(), url);
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (isNoise(url)) return;
    problems.failedRequests.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? 'failed'}`);
  });

  return problems;
}

function failedRequestPush(problems: PageProblems, status: number, method: string, url: string) {
  problems.failedRequests.push(`HTTP ${status} ${method} ${url}`);
}

/** Человекочитаемый отчёт для сообщения об упавшем тесте. */
export function describeProblems(problems: PageProblems): string {
  const parts: string[] = [];
  if (problems.pageErrors.length) parts.push(`Исключения на странице:\n  - ${problems.pageErrors.join('\n  - ')}`);
  if (problems.consoleErrors.length) parts.push(`Ошибки консоли:\n  - ${problems.consoleErrors.join('\n  - ')}`);
  if (problems.failedRequests.length) parts.push(`Неуспешные запросы:\n  - ${problems.failedRequests.join('\n  - ')}`);
  return parts.join('\n\n');
}

export const hasProblems = (p: PageProblems): boolean =>
  p.consoleErrors.length + p.pageErrors.length + p.failedRequests.length > 0;
