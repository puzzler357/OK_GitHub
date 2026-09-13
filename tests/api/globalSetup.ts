import { rmSync } from 'node:fs';
import path from 'node:path';

// Две базы: общая для тестов и отдельная для теста сброса системы —
// он чистит таблицы и не может их восстановить (см. resetDbPath.ts).
const testDbPaths = [
  path.join(__dirname, '..', '.tmp', 'api-test.db'),
  path.join(__dirname, '..', '.tmp', 'api-reset-test.db'),
];

// Каждый прогон стартует с чистой базы: sqlite.ts сам создаст таблицы и засеет данные.
function wipe() {
  for (const dbPath of testDbPaths) {
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(dbPath + suffix, { force: true });
    }
  }
}

export function setup() {
  wipe();
}

export function teardown() {
  wipe();
}
