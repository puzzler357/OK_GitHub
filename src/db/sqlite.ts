import Database from 'better-sqlite3';
import path from 'path';
import { ENTITIES } from '../data/entities';
import { runMigrations } from './migrate';
import { CORE_SEED, seedValues } from '../data/seedData';

// DB_PATH позволяет подменить файл базы (используется автотестами для изоляции).
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'local-hr-docs.db');
const db = new Database(dbPath);

// Приведение базы к текущей версии схемы. Список миграций общий с нативным
// режимом (src/data/schema.ts), исполнитель вынесен в migrate.ts, чтобы его
// можно было проверить тестом отдельно от приложения.
runMigrations(db);

// --- Первичный посев --------------------------------------------------------

const SEED_FLAG = 'seeded';

function countRows(table: string): number {
  return (db.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number }).c;
}

// Учётная запись владельца намеренно не сеется: пароль по умолчанию, зашитый
// в поставку, — это пароль, который знают все. При пустой таблице users
// приложение показывает экран первичной настройки (см. /api/auth/status).
function seed() {
  for (const { sql, rows } of CORE_SEED) {
    const stmt = db.prepare(sql);
    for (const row of rows) stmt.run(...(row as unknown[]));
  }

  for (const entity of ENTITIES) {
    const entitySeed = seedValues(entity.table);
    if (!entitySeed) continue;
    const stmt = db.prepare(entitySeed.sql);
    for (const row of entitySeed.rows) stmt.run(...row);
  }
}

// Посев выполняется ровно один раз за жизнь базы. Отметка в meta важна не
// только для скорости: без неё сброс системы был бы бессмысленным — демо-данные
// возвращались бы при следующем запуске.
if (db.prepare('SELECT value FROM meta WHERE key = ?').get(SEED_FLAG) === undefined) {
  // Пустая база — сеем демо-данные. Непустая (обновление со старой версии
  // схемы) — только ставим отметку, чтобы не задваивать существующие записи.
  if (countRows('employees') === 0 && countRows('users') === 0) {
    seed();
  }
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(SEED_FLAG, new Date().toISOString());
}

// Таблицы, которые очищает сброс системы. users намеренно не входит:
// учётная запись владельца должна пережить сброс, иначе в приложение
// будет не войти.
export const RESETTABLE_TABLES = [
  'employees',
  'departments',
  'positions',
  'templates',
  'timesheets',
  'archives',
  ...ENTITIES.map((e) => e.table),
];

export default db;
