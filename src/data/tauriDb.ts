// Реализация доступа к данным для нативного приложения (Tauri).
// Работает напрямую с локальной SQLite через @tauri-apps/plugin-sql —
// без сети, без сервера. Схема, миграции и первичные данные общие с
// веб-режимом: src/data/schema.ts и src/data/seedData.ts.
import Database from '@tauri-apps/plugin-sql';
import bcrypt from 'bcryptjs';
import type {
  Employee, Department, Position, TimesheetRecord, ArchiveRecord, ArchiveFilters, Template, LoginResult,
} from './types';
import {
  ENTITIES, ENTITY_BY_TABLE, AUDIT_TABLE, BACKUP_TABLES, insertSql, selectSql, updateSql, rowToObject, objectToValues,
} from './entities';
import { MIGRATIONS_TABLE_SQL, pendingMigrations } from './schema';
import { CORE_SEED, seedValues } from './seedData';
import { employeePatchFor, employeeUpdate } from './movements';

const DB_URL = 'sqlite:local-hr-docs.db';

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).then(async (db) => {
      await migrate(db);
      await seedIfEmpty(db);
      return db;
    });
  }
  return dbPromise;
}

// --- Миграции ---------------------------------------------------------------
// Схема и список миграций общие с веб-режимом (src/data/schema.ts).
// Здесь только исполнитель: он знает, как выполнить шаг через plugin-sql.

async function appliedVersion(db: Database): Promise<number> {
  const rows = await db.select<{ v: number | null }[]>('SELECT max(version) as v FROM _migrations');
  return rows[0]?.v ?? 0;
}

async function hasColumn(db: Database, table: string, column: string): Promise<boolean> {
  const columns = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
  return columns.some((c) => c.name === column);
}

async function migrate(db: Database) {
  await db.execute(MIGRATIONS_TABLE_SQL);

  for (const migration of pendingMigrations(await appliedVersion(db))) {
    for (const step of migration.steps) {
      if (step.kind === 'sql') {
        await db.execute(step.sql);
        continue;
      }
      // Проверка вместо try/catch: колонка могла появиться в базе,
      // созданной до того, как миграции завелись.
      if (!(await hasColumn(db, step.table, step.column))) {
        await db.execute(`ALTER TABLE ${step.table} ADD COLUMN ${step.column} ${step.definition}`);
      }
    }
    await db.execute(
      'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)',
      [migration.version, migration.name, new Date().toISOString()],
    );
  }
}

// --- Первичный посев --------------------------------------------------------

const SEED_FLAG = 'seeded';

async function count(db: Database, table: string): Promise<number> {
  const rows = await db.select<{ c: number }[]>(`SELECT count(*) as c FROM ${table}`);
  return rows[0]?.c ?? 0;
}

// Посев выполняется ровно один раз за жизнь базы. Без отметки в meta сброс
// системы был бы бессмысленным: демо-данные вернулись бы при следующем запуске.
// Учётная запись владельца не сеется — пароль по умолчанию в поставке это
// пароль, который знают все; владелец задаёт его при первом запуске.
async function seedIfEmpty(db: Database) {
  const flag = await db.select<{ value: string }[]>('SELECT value FROM meta WHERE key = ?', [SEED_FLAG]);
  if (flag.length > 0) return;

  // Непустая база (обновление со старой схемы) — только ставим отметку,
  // чтобы не задваивать уже существующие записи.
  if (await count(db, 'users') > 0 || await count(db, 'employees') > 0) {
    await db.execute('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, new Date().toISOString()]);
    return;
  }

  for (const { sql, rows } of CORE_SEED) {
    for (const row of rows) await db.execute(sql, row as unknown[]);
  }

  for (const entity of ENTITIES) {
    const entitySeed = seedValues(entity.table);
    if (!entitySeed) continue;
    for (const row of entitySeed.rows) await db.execute(entitySeed.sql, row);
  }

  await db.execute('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, new Date().toISOString()]);
}

const rid = () => Math.random().toString(36).substring(7);

// Журнал аудита пишется слоем данных, как и на сервере: событие должно
// попадать в журнал вместе с самим изменением, а не когда экран вспомнит.
async function audit(db: Database, action: string, entity: string, entityId?: string | null, diff?: string | null) {
  await db.execute(
    'INSERT INTO audit_log (id, ts, action, entity, entity_id, diff) VALUES (?, ?, ?, ?, ?, ?)',
    [rid(), new Date().toISOString(), action, entity, entityId ?? null, diff ?? null],
  );
}

// ---- Employees ----
export async function listEmployees(): Promise<Employee[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM employees');
  return rows.map((e) => ({
    id: e.id, fullName: e.full_name, position: e.position, department: e.department,
    status: e.status, hireDate: e.hire_date,
    tabNumber: e.tab_number ?? undefined, birthDate: e.birth_date ?? undefined,
    paymentType: e.payment_type || 'salary', salary: e.salary || 0, rate: e.rate ?? 1,
  }));
}
const INSERT_EMPLOYEE =
  'INSERT INTO employees (id, full_name, position, department, status, hire_date, tab_number, birth_date, payment_type, salary, rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

function employeeValues(id: string, e: Omit<Employee, 'id'>) {
  return [
    id, e.fullName, e.position, e.department, e.status, e.hireDate,
    e.tabNumber ?? null, e.birthDate ?? null, e.paymentType ?? 'salary', e.salary ?? 0, e.rate ?? 1,
  ];
}

export async function createEmployee(emp: Omit<Employee, 'id'> & { id?: string }): Promise<{ id: string }> {
  const db = await getDb();
  const id = emp.id || rid();
  await db.execute(INSERT_EMPLOYEE, employeeValues(id, emp));
  await audit(db, 'create', 'employees', id, emp.fullName);
  return { id };
}

// Массовая вставка для импорта из Excel: одной транзакцией, чтобы частично
// разобранный файл не оставил базу в half-состоянии.
export async function createEmployeesBulk(rows: (Omit<Employee, 'id'> & { id?: string })[]): Promise<{ ids: string[] }> {
  const db = await getDb();
  const ids = rows.map((r) => r.id || rid());
  await db.execute('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < rows.length; i++) {
      await db.execute(INSERT_EMPLOYEE, employeeValues(ids[i], rows[i]));
    }
    await db.execute('COMMIT');
  } catch (e) {
    await db.execute('ROLLBACK');
    throw e;
  }
  await audit(db, 'import', 'employees', null, `${ids.length}`);
  return { ids };
}
export async function updateEmployeeRow(id: string, e: Partial<Employee>): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE employees SET full_name = ?, position = ?, department = ?, status = ?, hire_date = ?, tab_number = ?, birth_date = ?, payment_type = ?, salary = ?, rate = ? WHERE id = ?',
    [e.fullName, e.position, e.department, e.status, e.hireDate, e.tabNumber ?? null, e.birthDate ?? null, e.paymentType ?? 'salary', e.salary ?? 0, e.rate ?? 1, id],
  );
  await audit(db, 'update', 'employees', id, e.fullName ?? null);
}
export async function deleteEmployeeRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM employees WHERE id = ?', [id]);
  await audit(db, 'delete', 'employees', id, null);
}

// ---- Departments ----
export async function listDepartments(): Promise<Department[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM departments');
  return rows.map((d) => ({ id: d.id, name: d.name, parentId: d.parent_id }));
}
export async function createDepartment(dep: Omit<Department, 'id'> & { id?: string }): Promise<{ id: string }> {
  const db = await getDb();
  const id = dep.id || rid();
  await db.execute('INSERT INTO departments (id, name, parent_id) VALUES (?, ?, ?)', [id, dep.name, dep.parentId ?? null]);
  return { id };
}
export async function updateDepartmentRow(id: string, data: Partial<Department>): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE departments SET name = ?, parent_id = ? WHERE id = ?', [data.name, data.parentId ?? null, id]);
}
export async function deleteDepartmentRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM departments WHERE id = ?', [id]);
}

// ---- Positions ----
export async function listPositions(): Promise<Position[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM positions');
  return rows.map((p) => ({ id: p.id, departmentId: p.department_id, title: p.title, maxCount: p.max_count, salary: p.salary }));
}
export async function createPosition(pos: Omit<Position, 'id'> & { id?: string }): Promise<{ id: string }> {
  const db = await getDb();
  const id = pos.id || rid();
  await db.execute('INSERT INTO positions (id, department_id, title, max_count, salary) VALUES (?, ?, ?, ?, ?)', [id, pos.departmentId, pos.title, pos.maxCount, pos.salary]);
  return { id };
}
export async function updatePositionRow(id: string, data: Partial<Position>): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE positions SET department_id = ?, title = ?, max_count = ?, salary = ? WHERE id = ?', [data.departmentId, data.title, data.maxCount, data.salary, id]);
}
export async function deletePositionRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM positions WHERE id = ?', [id]);
}

// ---- Templates ----
export async function listTemplates(): Promise<Template[]> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM templates');
  return rows.map((t) => ({ id: t.id, name: t.name, blocks: JSON.parse(t.blocks) }));
}
export async function createTemplate(tpl: Omit<Template, 'id'> & { id?: string }): Promise<{ id: string }> {
  const db = await getDb();
  const id = tpl.id || rid();
  await db.execute('INSERT INTO templates (id, name, blocks) VALUES (?, ?, ?)', [id, tpl.name, JSON.stringify(tpl.blocks)]);
  return { id };
}
export async function updateTemplateRow(id: string, data: Partial<Template>): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE templates SET name = ?, blocks = ? WHERE id = ?', [data.name, JSON.stringify(data.blocks), id]);
}
export async function deleteTemplateRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM templates WHERE id = ?', [id]);
}

// ---- Timesheets ----
export async function listTimesheets(year?: number, month?: number): Promise<TimesheetRecord[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: any[] = [];
  if (year !== undefined) { where.push(`year = $${params.push(year)}`); }
  if (month !== undefined) { where.push(`month = $${params.push(month)}`); }
  const rows = await db.select<any[]>(
    `SELECT * FROM timesheets${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );
  return rows.map((t) => ({ id: t.id, year: t.year, month: t.month, employeeId: t.employee_id, days: JSON.parse(t.days) }));
}
export async function createTimesheet(rec: Omit<TimesheetRecord, 'id'> & { id?: string }): Promise<{ id: string }> {
  const db = await getDb();
  const id = rec.id || rid();
  await db.execute('INSERT INTO timesheets (id, year, month, employee_id, days) VALUES (?, ?, ?, ?, ?)', [id, rec.year, rec.month, rec.employeeId, JSON.stringify(rec.days)]);
  return { id };
}
export async function updateTimesheetRow(id: string, data: Partial<TimesheetRecord>): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE timesheets SET year = ?, month = ?, employee_id = ?, days = ? WHERE id = ?', [data.year, data.month, data.employeeId, JSON.stringify(data.days), id]);
}
export async function deleteTimesheetRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM timesheets WHERE id = ?', [id]);
}

// ---- Archives ----
export async function listArchiveFacets(): Promise<{ years: number[]; departments: string[] }> {
  const db = await getDb();
  const years = await db.select<{ year: number }[]>('SELECT DISTINCT year FROM archives ORDER BY year DESC');
  const departments = await db.select<{ department: string }[]>('SELECT DISTINCT department FROM archives ORDER BY department');
  return { years: years.map((r) => r.year), departments: departments.map((r) => r.department) };
}

export async function listArchives(filters: ArchiveFilters = {}): Promise<ArchiveRecord[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: any[] = [];
  if (filters.year !== undefined) { where.push(`year = $${params.push(filters.year)}`); }
  if (filters.department !== undefined) { where.push(`department = $${params.push(filters.department)}`); }
  if (filters.employeeId !== undefined) { where.push(`employee_id = $${params.push(filters.employeeId)}`); }
  const rows = await db.select<any[]>(
    `SELECT * FROM archives${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`,
    params,
  );
  return rows.map((a) => ({
    id: a.id, year: a.year, month: a.month, employeeId: a.employee_id, employeeName: a.employee_name,
    department: a.department, position: a.position, salary: a.salary, hoursWorked: a.hours_worked,
  }));
}
export async function createArchive(rec: Omit<ArchiveRecord, 'id'> & { id?: string }): Promise<{ id: string }> {
  const db = await getDb();
  const id = rec.id || rid();
  await db.execute('INSERT INTO archives (id, year, month, employee_id, employee_name, department, position, salary, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, rec.year, rec.month, rec.employeeId, rec.employeeName, rec.department, rec.position, rec.salary, rec.hoursWorked]);
  return { id };
}
export async function deleteArchiveRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM archives WHERE id = ?', [id]);
}

// ---- Сущности, описанные в entities.ts ----
// Один набор операций на все семь таблиц: расписывать 28 почти одинаковых
// функций руками — верный способ развести ветки доступа к данным.

export async function listEntity(table: string): Promise<any[]> {
  const entity = ENTITY_BY_TABLE.get(table);
  if (!entity) throw new Error(`Неизвестная таблица: ${table}`);
  const db = await getDb();
  const rows = await db.select<any[]>(selectSql(entity));
  return rows.map((r) => rowToObject(entity, r));
}

export async function createEntity(table: string, data: any): Promise<{ id: string }> {
  const entity = ENTITY_BY_TABLE.get(table);
  if (!entity) throw new Error(`Неизвестная таблица: ${table}`);
  const db = await getDb();
  const id = data.id || rid();
  await db.execute(insertSql(entity), [id, ...objectToValues(entity, data)]);
  if (entity.table !== AUDIT_TABLE) await audit(db, 'create', entity.table, id, null);
  return { id };
}

export async function updateEntity(table: string, id: string, patch: any): Promise<void> {
  const entity = ENTITY_BY_TABLE.get(table);
  if (!entity) throw new Error(`Неизвестная таблица: ${table}`);
  const update = updateSql(entity, patch);
  if (!update) return;
  const db = await getDb();
  await db.execute(update.sql, [...update.values, id]);
  if (entity.table !== AUDIT_TABLE) await audit(db, 'update', entity.table, id, Object.keys(patch).join(', '));
}

export async function deleteEntity(table: string, id: string): Promise<void> {
  const entity = ENTITY_BY_TABLE.get(table);
  if (!entity) throw new Error(`Неизвестная таблица: ${table}`);
  const db = await getDb();
  await db.execute(`DELETE FROM ${entity.table} WHERE id = ?`, [id]);
  if (entity.table !== AUDIT_TABLE) await audit(db, 'delete', entity.table, id, null);
}

// ---- Кадровые операции ----
// Запись и изменение карточки — одной транзакцией, как и на сервере.
export async function applyMovement(movement: any): Promise<{ id: string; movement: any; employeePatch: any }> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM employees WHERE id = ?', [movement.employeeId]);
  const employee = rows[0];
  if (!employee) throw new Error('Сотрудник не найден');

  const record = {
    ...movement,
    fromPosition: employee.position,
    fromDepartment: employee.department,
    fromSalary: employee.salary ?? 0,
  };

  const entity = ENTITY_BY_TABLE.get('movements')!;
  const id = movement.id || rid();
  const patch = employeePatchFor(record);
  const update = employeeUpdate(patch);

  await db.execute('BEGIN TRANSACTION');
  try {
    await db.execute(insertSql(entity), [id, ...objectToValues(entity, record)]);
    if (update) {
      await db.execute(`UPDATE employees SET ${update.assignments} WHERE id = ?`, [...update.values, movement.employeeId]);
    }
    await db.execute('COMMIT');
  } catch (e) {
    await db.execute('ROLLBACK');
    throw e;
  }

  await audit(db, 'movement', 'employees', movement.employeeId, `${movement.type} · ${movement.date}`);
  return { id, movement: { ...record, id }, employeePatch: patch };
}

/** Очистка выбранных таблиц — очистка данных отдельных модулей. */
export async function resetTables(adminPassword: string, tables: string[]): Promise<{ cleared: string[] }> {
  const db = await getDb();
  const rows = await db.select<any[]>("SELECT * FROM users WHERE role = 'ADMIN'");
  const admin = rows[0];
  if (!admin || !bcrypt.compareSync(adminPassword, admin.password_hash)) {
    throw new Error('Неверный пароль администратора');
  }

  const requested = tables.filter((t) => BACKUP_TABLES.includes(t));
  if (requested.length === 0) throw new Error('Не выбрано ни одной известной таблицы');

  await db.execute('BEGIN TRANSACTION');
  try {
    for (const table of requested) await db.execute(`DELETE FROM ${table}`);
    await db.execute('COMMIT');
  } catch (e) {
    await db.execute('ROLLBACK');
    throw e;
  }

  await audit(db, 'reset_tables', 'system', null, requested.join(', '));
  return { cleared: requested };
}

// ---- Резервные копии ----
export async function exportBackup(): Promise<{ version: number; createdAt: string; data: Record<string, unknown[]> }> {
  const db = await getDb();
  const data: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await db.select<any[]>(`SELECT * FROM ${table}`);
  }
  await audit(db, 'backup', 'system', null, `${BACKUP_TABLES.length}`);
  return { version: 1, createdAt: new Date().toISOString(), data };
}

export async function restoreBackup(payload: any): Promise<{ restored: number; tables: number }> {
  if (!payload || typeof payload.data !== 'object' || payload.data === null) {
    throw new Error('Файл не похож на резервную копию');
  }

  const tables = BACKUP_TABLES.filter((table) => Array.isArray(payload.data[table]));
  if (tables.length === 0) throw new Error('В копии нет ни одной известной таблицы');

  const db = await getDb();
  let restored = 0;

  await db.execute('BEGIN TRANSACTION');
  try {
    for (const table of tables) {
      await db.execute(`DELETE FROM ${table}`);

      const rows = payload.data[table] as Record<string, unknown>[];
      if (rows.length === 0) continue;

      const info = await db.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
      const known = new Set(info.map((c) => c.name));
      const columns = Object.keys(rows[0]).filter((c) => known.has(c));
      if (columns.length === 0) continue;

      const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`;
      for (const row of rows) {
        await db.execute(sql, columns.map((c) => row[c] ?? null));
        restored += 1;
      }
    }
    await db.execute('COMMIT');
  } catch (e) {
    await db.execute('ROLLBACK');
    throw e;
  }

  await audit(db, 'restore', 'system', null, `${restored}`);
  return { restored, tables: tables.length };
}

// ---- Auth (локальная, без JWT) ----

/** Есть ли владелец. Пока нет — показывается экран первичной настройки. */
export async function authStatus(): Promise<{ needsSetup: boolean }> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>('SELECT count(*) as c FROM users');
  return { needsSetup: (rows[0]?.c ?? 0) === 0 };
}

export async function setupOwner(name: string, email: string, password: string): Promise<LoginResult> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>('SELECT count(*) as c FROM users');
  if ((rows[0]?.c ?? 0) > 0) throw new Error('Владелец уже назначен');
  if (!email || !password || password.length < 8) throw new Error('Нужны email и пароль не короче 8 символов');

  const id = '1';
  await db.execute(
    'INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
    [id, email, bcrypt.hashSync(password, 10), 'ADMIN', name || email],
  );
  await audit(db, 'setup', 'auth', id, email);

  return { user: { id, email, name: name || email, role: 'ADMIN' }, token: 'local' };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    await audit(db, 'login_failed', 'auth', null, email);
    throw new Error('Неверный email или пароль');
  }
  await audit(db, 'login', 'auth', user.id, user.email);
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: 'local' };
}
export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    throw new Error('Неверный текущий пароль');
  }
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), user.id]);
  await audit(db, 'password_change', 'auth', user.id, user.email);
}
export async function resetSystem(adminPassword: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<any[]>("SELECT * FROM users WHERE role = 'ADMIN'");
  const admin = rows[0];
  if (!admin || !bcrypt.compareSync(adminPassword, admin.password_hash)) {
    throw new Error('Неверный пароль администратора');
  }
  // users намеренно не трогаем: учётная запись владельца должна пережить
  // сброс, иначе в приложение будет не войти. Список совпадает с серверным
  // RESETTABLE_TABLES в src/db/sqlite.ts.
  const tables = ['employees', 'departments', 'positions', 'templates', 'timesheets', 'archives', ...ENTITIES.map((e) => e.table)];
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table}`);
  }
  await audit(db, 'reset', 'system', null, tables.join(', '));
}
