import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Проект собран как ESM ("type": "module"), поэтому __dirname недоступен.
const here = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(here, '..', '.tmp');

/** Файл БД, с которым работает сервер во время e2e (рабочая база не трогается). */
export const e2eDbPath = path.join(tmpDir, 'e2e.db');

/** Состояние авторизации, которое готовит проект `setup`. */
export const storageStatePath = path.join(tmpDir, 'storage-state.json');

export const reportDir = path.join(tmpDir, 'playwright-report');
export const artifactsDir = path.join(tmpDir, 'playwright-artifacts');
