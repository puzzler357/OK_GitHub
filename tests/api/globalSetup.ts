import { rmSync } from 'node:fs';
import path from 'node:path';

const testDbPath = path.join(__dirname, '..', '.tmp', 'api-test.db');

// Каждый прогон стартует с чистой базы: sqlite.ts сам создаст таблицы и засеет данные.
function wipe() {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(testDbPath + suffix, { force: true });
  }
}

export function setup() {
  wipe();
}

export function teardown() {
  wipe();
}
