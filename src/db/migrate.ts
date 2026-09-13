import type DatabaseType from 'better-sqlite3';
import { MIGRATIONS_TABLE_SQL, pendingMigrations } from '../data/schema';

type Db = DatabaseType.Database;

function appliedVersion(db: Db): number {
  const row = db.prepare('SELECT max(version) as v FROM _migrations').get() as { v: number | null };
  return row.v ?? 0;
}

function hasColumn(db: Db, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

/**
 * Приводит базу к текущей версии схемы.
 *
 * Список миграций общий с нативным режимом (src/data/schema.ts) — здесь
 * только исполнитель для better-sqlite3. Функция идемпотентна: применённые
 * версии записаны в _migrations, повторный вызов ничего не делает.
 *
 * Возвращает версию, до которой доведена база.
 */
export function runMigrations(db: Db): number {
  db.exec(MIGRATIONS_TABLE_SQL);

  for (const migration of pendingMigrations(appliedVersion(db))) {
    db.transaction(() => {
      for (const step of migration.steps) {
        if (step.kind === 'sql') {
          db.exec(step.sql);
          continue;
        }
        // Проверка вместо try/catch: колонка могла появиться в базе,
        // созданной до того, как миграции завелись.
        if (!hasColumn(db, step.table, step.column)) {
          db.exec(`ALTER TABLE ${step.table} ADD COLUMN ${step.column} ${step.definition}`);
        }
      }
      db.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString());
    })();
  }

  return appliedVersion(db);
}
