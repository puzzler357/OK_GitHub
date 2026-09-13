// Реализация доступа к данным для нативного приложения (Tauri).
// Работает напрямую с локальной SQLite через @tauri-apps/plugin-sql —
// без сети, без сервера. Схема и первичные данные создаются здесь же.
import Database from '@tauri-apps/plugin-sql';
import bcrypt from 'bcryptjs';
import type {
  Employee, Department, Position, TimesheetRecord, ArchiveRecord, ArchiveFilters, Template, LoginResult,
} from './types';
import {
  ENTITIES, ENTITY_BY_TABLE, AUDIT_TABLE, allSchemaSql, insertSql, selectSql, updateSql, rowToObject, objectToValues,
} from './entities';
import { seedValues } from './seedData';
import { employeePatchFor, employeeUpdate } from './movements';

const DB_URL = 'sqlite:local-hr-docs.db';

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).then(async (db) => {
      await initSchema(db);
      await seedIfEmpty(db);
      return db;
    });
  }
  return dbPromise;
}

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL,
      hire_date TEXT NOT NULL,
      tab_number TEXT,
      birth_date TEXT,
      payment_type TEXT DEFAULT 'salary',
      salary REAL DEFAULT 0,
      rate REAL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT
    );
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      title TEXT NOT NULL,
      max_count INTEGER NOT NULL,
      salary REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      blocks TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      employee_id TEXT NOT NULL,
      days TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS archives (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      salary REAL NOT NULL,
      hours_worked REAL NOT NULL
    );
    -- Служебные флаги; сейчас хранит отметку о первичном посеве.
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Индексы под выборки по срезу и фильтры экранов. Без них каждый запрос
    -- по году/месяцу или подразделению — полное сканирование таблицы.
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(year, month);
    CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id);
    CREATE INDEX IF NOT EXISTS idx_archives_year ON archives(year);
    CREATE INDEX IF NOT EXISTS idx_archives_employee ON archives(employee_id);
    CREATE INDEX IF NOT EXISTS idx_archives_department ON archives(department);
    CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department_id);
    CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
    ${allSchemaSql()}
  `);

  // База, созданная предыдущей версией схемы, колонки tab_number не имеет.
  const columns = await db.select<{ name: string }[]>('PRAGMA table_info(employees)');
  if (!columns.some((c) => c.name === 'tab_number')) {
    await db.execute('ALTER TABLE employees ADD COLUMN tab_number TEXT');
  }
}

async function count(db: Database, table: string): Promise<number> {
  const rows = await db.select<{ c: number }[]>(`SELECT count(*) as c FROM ${table}`);
  return rows[0]?.c ?? 0;
}

const SEED_FLAG = 'seeded';

// Посев выполняется ровно один раз за жизнь базы. Без отметки в meta сброс
// системы был бы бессмысленным: демо-данные вернулись бы при следующем запуске.
async function seedIfEmpty(db: Database) {
  const flag = await db.select<{ value: string }[]>('SELECT value FROM meta WHERE key = ?', [SEED_FLAG]);
  if (flag.length > 0) return;

  // Непустая база (обновление со старой схемы) — только ставим отметку,
  // чтобы не задваивать уже существующие записи.
  if (await count(db, 'users') > 0 || await count(db, 'employees') > 0) {
    await db.execute('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [SEED_FLAG, new Date().toISOString()]);
    return;
  }

  // Учётная запись владельца не сеется: пароль по умолчанию в поставке —
  // это пароль, который знают все. Владелец задаёт его при первом запуске.
  {
    const emps: [string, string, string, string, string, string, string][] = [
      ['1', 'Иванов Иван Иванович', 'Старший разработчик', 'IT', 'active', '2021-03-15', '0001'],
      ['2', 'Петров Петр Петрович', 'Менеджер по продажам', 'Продажи', 'active', '2022-11-01', '0002'],
      ['3', 'Смирнова Анна Игоревна', 'HR Специалист', 'HR', 'on_leave', '2020-05-20', '0003'],
      ['4', 'Аманмурадов Мердан', 'Аналитик данных', 'Аналитика', 'active', '2023-01-10', '0004'],
      ['5', 'Бердыева Айгуль', 'Junior Дизайнер', 'Дизайн', 'probation', '2024-02-15', '0005'],
    ];
    for (const e of emps) {
      await db.execute(
        'INSERT INTO employees (id, full_name, position, department, status, hire_date, tab_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        e,
      );
    }
  }

  {
    const deps: [string, string, string | null][] = [
      ['d1', 'ООО "Глобал Тек"', null],
      ['d2', 'IT', 'd1'], ['d3', 'Продажи', 'd1'], ['d4', 'HR', 'd1'],
      ['d5', 'Аналитика', 'd1'], ['d6', 'Дизайн', 'd1'],
    ];
    for (const d of deps) {
      await db.execute('INSERT INTO departments (id, name, parent_id) VALUES (?, ?, ?)', d);
    }
  }

  {
    const pos: [string, string, string, number, number][] = [
      ['p1', 'd1', 'Генеральный директор', 1, 250000],
      ['p2', 'd1', 'Финансовый директор', 1, 180000],
      ['p3', 'd1', 'Главный бухгалтер', 1, 150000],
      ['p4', 'd2', 'Старший разработчик', 3, 500000],
      ['p5', 'd2', 'Разработчик', 5, 300000],
      ['p6', 'd3', 'Менеджер по продажам', 10, 250000],
      ['p7', 'd4', 'HR Специалист', 2, 180000],
      ['p8', 'd5', 'Аналитик данных', 3, 250000],
      ['p9', 'd6', 'Junior Дизайнер', 2, 120000],
    ];
    for (const p of pos) {
      await db.execute('INSERT INTO positions (id, department_id, title, max_count, salary) VALUES (?, ?, ?, ?, ?)', p);
    }
  }

  {
    const blocks = JSON.stringify([{ id: '1', type: 'text', content: 'Справка дана {{fullName}} в том, что он(а) действительно работает в ООО "Глобал Тек" в должности {{position}}.' }]);
    await db.execute('INSERT INTO templates (id, name, blocks) VALUES (?, ?, ?)', ['1', 'Справка с места работы', blocks]);
  }

  {
    const arch: [string, number, number, string, string, string, string, number, number][] = [
      ['a1', 2023, 12, '1', 'Иванов Иван Иванович', 'IT', 'Старший разработчик', 500000, 160],
      ['a2', 2023, 12, '2', 'Петров Петр Петрович', 'Продажи', 'Менеджер по продажам', 300000, 150],
      ['a3', 2023, 11, '1', 'Иванов Иван Иванович', 'IT', 'Старший разработчик', 500000, 168],
      ['a4', 2023, 11, '2', 'Петров Петр Петрович', 'Продажи', 'Менеджер по продажам', 280000, 160],
      ['a5', 2022, 12, '1', 'Иванов Иван Иванович', 'IT', 'Разработчик', 400000, 160],
    ];
    for (const a of arch) {
      await db.execute('INSERT INTO archives (id, year, month, employee_id, employee_name, department, position, salary, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', a);
    }
  }

  for (const entity of ENTITIES) {
    const seed = seedValues(entity.table);
    if (!seed) continue;
    for (const row of seed.rows) await db.execute(seed.sql, row);
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
