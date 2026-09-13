import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

// DB_PATH позволяет подменить файл базы (используется автотестами для изоляции).
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'local-hr-docs.db');
const db = new Database(dbPath);

db.exec(`
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

  -- Служебные флаги. Сейчас хранит отметку о первичном посеве,
  -- чтобы демо-данные не возвращались после сброса системы.
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Миграции для баз, созданных предыдущими версиями схемы.
function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('employees', 'tab_number', 'TEXT');
addColumnIfMissing('employees', 'birth_date', 'TEXT');
addColumnIfMissing('employees', 'payment_type', "TEXT DEFAULT 'salary'");
addColumnIfMissing('employees', 'salary', 'REAL DEFAULT 0');
addColumnIfMissing('employees', 'rate', 'REAL DEFAULT 1');

const SEED_FLAG = 'seeded';

function countRows(table: string): number {
  return (db.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number }).c;
}

function seed() {
  const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)');

  // Пароль по умолчанию — password123, меняется в «Настройках».
  const defaultHash = bcrypt.hashSync('password123', 10);

  // Однопользовательское приложение: единственная учётная запись владельца устройства.
  insertUser.run('1', 'admin@global.tech', defaultHash, 'ADMIN', 'Иванов Иван');

  const insertEmp = db.prepare('INSERT INTO employees (id, full_name, position, department, status, hire_date, tab_number) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertEmp.run('1', 'Иванов Иван Иванович', 'Старший разработчик', 'IT', 'active', '2021-03-15', '0001');
  insertEmp.run('2', 'Петров Петр Петрович', 'Менеджер по продажам', 'Продажи', 'active', '2022-11-01', '0002');
  insertEmp.run('3', 'Смирнова Анна Игоревна', 'HR Специалист', 'HR', 'on_leave', '2020-05-20', '0003');
  insertEmp.run('4', 'Аманмурадов Мердан', 'Аналитик данных', 'Аналитика', 'active', '2023-01-10', '0004');
  insertEmp.run('5', 'Бердыева Айгуль', 'Junior Дизайнер', 'Дизайн', 'probation', '2024-02-15', '0005');

  const insertDep = db.prepare('INSERT INTO departments (id, name, parent_id) VALUES (?, ?, ?)');
  insertDep.run('d1', 'ООО "Глобал Тек"', null);
  insertDep.run('d2', 'IT', 'd1');
  insertDep.run('d3', 'Продажи', 'd1');
  insertDep.run('d4', 'HR', 'd1');
  insertDep.run('d5', 'Аналитика', 'd1');
  insertDep.run('d6', 'Дизайн', 'd1');

  const insertPos = db.prepare('INSERT INTO positions (id, department_id, title, max_count, salary) VALUES (?, ?, ?, ?, ?)');
  insertPos.run('p1', 'd1', 'Генеральный директор', 1, 250000);
  insertPos.run('p2', 'd1', 'Финансовый директор', 1, 180000);
  insertPos.run('p3', 'd1', 'Главный бухгалтер', 1, 150000);
  insertPos.run('p4', 'd2', 'Старший разработчик', 3, 500000);
  insertPos.run('p5', 'd2', 'Разработчик', 5, 300000);
  insertPos.run('p6', 'd3', 'Менеджер по продажам', 10, 250000);
  insertPos.run('p7', 'd4', 'HR Специалист', 2, 180000);
  insertPos.run('p8', 'd5', 'Аналитик данных', 3, 250000);
  insertPos.run('p9', 'd6', 'Junior Дизайнер', 2, 120000);

  const insertTemplate = db.prepare('INSERT INTO templates (id, name, blocks) VALUES (?, ?, ?)');
  const blocks = JSON.stringify([{ id: '1', type: 'text', content: 'Справка дана {{fullName}} в том, что он(а) действительно работает в ООО "Глобал Тек" в должности {{position}}.' }]);
  insertTemplate.run('1', 'Справка с места работы', blocks);

  const insertArchive = db.prepare('INSERT INTO archives (id, year, month, employee_id, employee_name, department, position, salary, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertArchive.run('a1', 2023, 12, '1', 'Иванов Иван Иванович', 'IT', 'Старший разработчик', 500000, 160);
  insertArchive.run('a2', 2023, 12, '2', 'Петров Петр Петрович', 'Продажи', 'Менеджер по продажам', 300000, 150);
  insertArchive.run('a3', 2023, 11, '1', 'Иванов Иван Иванович', 'IT', 'Старший разработчик', 500000, 168);
  insertArchive.run('a4', 2023, 11, '2', 'Петров Петр Петрович', 'Продажи', 'Менеджер по продажам', 280000, 160);
  insertArchive.run('a5', 2022, 12, '1', 'Иванов Иван Иванович', 'IT', 'Разработчик', 400000, 160);
}

// Посев выполняется ровно один раз за жизнь базы. Отметка в meta важна не
// только для скорости: без неё сброс системы был бы бессмысленным — демо-данные
// возвращались бы при следующем запуске.
if (db.prepare('SELECT value FROM meta WHERE key = ?').get(SEED_FLAG) === undefined) {
  // Пустая база — сеем. Непустая (обновление со старой версии схемы) —
  // только ставим отметку, чтобы не задваивать уже существующие записи.
  if (countRows('users') === 0) {
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
] as const;

export default db;
