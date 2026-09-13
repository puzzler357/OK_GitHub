import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Тесты работают с отдельным файлом БД, чтобы не трогать рабочую local-hr-docs.db.
const testDbPath = path.join(__dirname, 'tests', '.tmp', 'api-test.db');

export default defineConfig({
  test: {
    // Модульные тесты проверяют чистые функции и не поднимают ни сервер,
    // ни браузер; API-тесты работают с отдельным файлом БД.
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/api/globalSetup.ts'],
    // Файлы тестов пишут в одну и ту же SQLite-базу — гоняем их последовательно.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DB_PATH: testDbPath,
      HR_NO_AUTOSTART: '1',
      JWT_SECRET: 'test-secret',
    },
  },
});
