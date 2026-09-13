import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrate';
import { LATEST_VERSION, MIGRATIONS } from '../../src/data/schema';

/** Свежая база в памяти — миграции не должны зависеть от файла на диске. */
const freshDb = () => new Database(':memory:');

describe('миграции схемы', () => {
  it('доводят пустую базу до текущей версии', () => {
    const db = freshDb();

    expect(runMigrations(db)).toBe(LATEST_VERSION);

    const applied = db.prepare('SELECT version FROM _migrations ORDER BY version').all() as { version: number }[];
    expect(applied.map(r => r.version)).toEqual(MIGRATIONS.map(m => m.version));
  });

  it('идемпотентны: повторный прогон ничего не добавляет', () => {
    const db = freshDb();
    runMigrations(db);
    const firstCount = (db.prepare('SELECT count(*) as c FROM _migrations').get() as { c: number }).c;

    // Прежняя схема глушила ошибку ALTER TABLE через try/catch; здесь второй
    // прогон обязан отработать штатно и ничего не изменить.
    expect(runMigrations(db)).toBe(LATEST_VERSION);
    const secondCount = (db.prepare('SELECT count(*) as c FROM _migrations').get() as { c: number }).c;

    expect(secondCount).toBe(firstCount);
  });

  it('создают все таблицы и колонки, на которые рассчитывает приложение', () => {
    const db = freshDb();
    runMigrations(db);

    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(r => r.name),
    );
    for (const table of ['users', 'employees', 'departments', 'positions', 'templates', 'timesheets', 'archives',
      'candidates', 'time_off_requests', 'checklist_tasks', 'goals', 'reviews', 'movements', 'audit_log',
      'report_presets', 'backups', 'kb_categories', 'kb_articles', 'meta']) {
      expect(tables.has(table), `нет таблицы ${table}`).toBe(true);
    }

    const employeeColumns = new Set(
      (db.prepare('PRAGMA table_info(employees)').all() as { name: string }[]).map(c => c.name),
    );
    for (const column of ['tab_number', 'birth_date', 'payment_type', 'salary', 'rate']) {
      expect(employeeColumns.has(column), `нет колонки ${column}`).toBe(true);
    }
  });

  it('догоняют базу, созданную до появления миграций', () => {
    const db = freshDb();
    // Имитируем старую базу: таблица есть, служебной _migrations нет,
    // часть колонок уже добавлена вручную прежним кодом.
    db.exec(`
      CREATE TABLE employees (
        id TEXT PRIMARY KEY, full_name TEXT NOT NULL, position TEXT NOT NULL,
        department TEXT NOT NULL, status TEXT NOT NULL, hire_date TEXT NOT NULL,
        birth_date TEXT
      );
    `);
    db.prepare('INSERT INTO employees (id, full_name, position, department, status, hire_date) VALUES (?, ?, ?, ?, ?, ?)')
      .run('1', 'Старый Сотрудник', 'Инженер', 'IT', 'active', '2020-01-01');

    expect(runMigrations(db)).toBe(LATEST_VERSION);

    const columns = new Set((db.prepare('PRAGMA table_info(employees)').all() as { name: string }[]).map(c => c.name));
    expect(columns.has('tab_number')).toBe(true);
    expect(columns.has('birth_date')).toBe(true);

    // Данные на месте: миграция добавляет колонки, а не пересоздаёт таблицу.
    const row = db.prepare('SELECT full_name FROM employees WHERE id = ?').get('1') as { full_name: string };
    expect(row.full_name).toBe('Старый Сотрудник');
  });
});
