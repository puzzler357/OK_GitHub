import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

// DB_PATH позволяет подменить файл базы (используется автотестами для изоляции).
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'local-hr-docs.db');
const db = new Database(dbPath);

// Initialize Tables
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
    hire_date TEXT NOT NULL
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
`);

// Seed initial users if none exist
try {
  db.exec('ALTER TABLE employees ADD COLUMN birth_date TEXT');
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec("ALTER TABLE employees ADD COLUMN payment_type TEXT DEFAULT 'salary'");
  db.exec("ALTER TABLE employees ADD COLUMN salary REAL DEFAULT 0");
  db.exec("ALTER TABLE employees ADD COLUMN rate REAL DEFAULT 1");
} catch (e) {
  // Ignore if column already exists
}

const stmt = db.prepare('SELECT count(*) as count FROM users');
const row = stmt.get() as { count: number };

if (row.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)');

  // Default password123
  const defaultHash = bcrypt.hashSync('password123', 10);

  // Однопользовательское приложение: единственная учётная запись владельца устройства.
  insertUser.run('1', 'admin@global.tech', defaultHash, 'ADMIN', 'Иванов Иван');
  
  // Seed employees too
  const insertEmp = db.prepare('INSERT INTO employees (id, full_name, position, department, status, hire_date) VALUES (?, ?, ?, ?, ?, ?)');
  insertEmp.run('1', 'Иванов Иван Иванович', 'Старший разработчик', 'IT', 'active', '2021-03-15');
  insertEmp.run('2', 'Петров Петр Петрович', 'Менеджер по продажам', 'Продажи', 'active', '2022-11-01');
  insertEmp.run('3', 'Смирнова Анна Игоревна', 'HR Специалист', 'HR', 'on_leave', '2020-05-20');
  insertEmp.run('4', 'Аманмурадов Мердан', 'Аналитик данных', 'Аналитика', 'active', '2023-01-10');
  insertEmp.run('5', 'Бердыева Айгуль', 'Junior Дизайнер', 'Дизайн', 'probation', '2024-02-15');

  // Seed departments
  const stmtDeps = db.prepare('SELECT count(*) as count FROM departments');
  if ((stmtDeps.get() as any).count === 0) {
    const insertDep = db.prepare('INSERT INTO departments (id, name, parent_id) VALUES (?, ?, ?)');
    insertDep.run('d1', 'ООО "Глобал Тек"', null);
    insertDep.run('d2', 'IT', 'd1');
    insertDep.run('d3', 'Продажи', 'd1');
    insertDep.run('d4', 'HR', 'd1');
    insertDep.run('d5', 'Аналитика', 'd1');
    insertDep.run('d6', 'Дизайн', 'd1');
  }

  // Seed positions
  const stmtPos = db.prepare('SELECT count(*) as count FROM positions');
  if ((stmtPos.get() as any).count === 0) {
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
  }

  // Seed template
  const insertTemplate = db.prepare('INSERT INTO templates (id, name, blocks) VALUES (?, ?, ?)');
  const blocks = JSON.stringify([{ id: '1', type: 'text', content: 'Справка дана {{fullName}} в том, что он(а) действительно работает в ООО "Глобал Тек" в должности {{position}}.' }]);
  insertTemplate.run('1', 'Справка с места работы', blocks);
}


  // Seed archives
  const stmtArchives = db.prepare('SELECT count(*) as count FROM archives');
  const rowArchives = stmtArchives.get() as { count: number };
  if (rowArchives.count === 0) {
    const insertArchive = db.prepare('INSERT INTO archives (id, year, month, employee_id, employee_name, department, position, salary, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertArchive.run('a1', 2023, 12, '1', 'Иванов Иван Иванович', 'IT', 'Старший разработчик', 500000, 160);
    insertArchive.run('a2', 2023, 12, '2', 'Петров Петр Петрович', 'Продажи', 'Менеджер по продажам', 300000, 150);
    insertArchive.run('a3', 2023, 11, '1', 'Иванов Иван Иванович', 'IT', 'Старший разработчик', 500000, 168);
    insertArchive.run('a4', 2023, 11, '2', 'Петров Петр Петрович', 'Продажи', 'Менеджер по продажам', 280000, 160);
    insertArchive.run('a5', 2022, 12, '1', 'Иванов Иван Иванович', 'IT', 'Разработчик', 400000, 160);
  }
export default db;
