import './src/env';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import db, { RESETTABLE_TABLES } from './src/db/sqlite';

export const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-key-2024';

app.use(cors());
app.use(express.json());

// API Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

app.post('/api/auth/change-password', (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный текущий пароль' });
  }
  
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
  
  res.json({ success: true });
});

app.post('/api/auth/reset-system', (req, res) => {
  const { adminPassword } = req.body;
  
  const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('ADMIN') as any;
  if (!admin || !bcrypt.compareSync(adminPassword, admin.password_hash)) {
    return res.status(401).json({ error: 'Неверный пароль администратора' });
  }
  
  // Чистим все таблицы данных одной транзакцией; учётная запись владельца
  // в список не входит и переживает сброс.
  db.transaction(() => {
    for (const table of RESETTABLE_TABLES) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  })();

  
  res.json({ success: true, message: 'Все данные системы были успешно сброшены' });
});

// API Employees
app.get('/api/employees', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees').all().map((e: any) => ({
    id: e.id,
    fullName: e.full_name,
    position: e.position,
    department: e.department,
    status: e.status,
    hireDate: e.hire_date,
    tabNumber: e.tab_number ?? undefined,
    birthDate: e.birth_date,
    paymentType: e.payment_type || 'salary',
    salary: e.salary || 0,
    rate: e.rate || 1
  }));
  res.json(employees);
});

const insertEmployee = () => db.prepare(
  'INSERT INTO employees (id, full_name, position, department, status, hire_date, tab_number, birth_date, payment_type, salary, rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
);

const newEmployeeId = () => Math.random().toString(36).substring(7);

app.post('/api/employees', (req, res) => {
  const { id, fullName, position, department, status, hireDate, tabNumber, birthDate, paymentType = 'salary', salary = 0, rate = 1 } = req.body;
  const newId = id || newEmployeeId();
  insertEmployee().run(newId, fullName, position, department, status, hireDate, tabNumber ?? null, birthDate, paymentType, salary, rate);
  res.json({ id: newId });
});

// Массовая вставка для импорта из Excel: одна транзакция на весь файл.
app.post('/api/employees/bulk', (req, res) => {
  const rows = Array.isArray(req.body?.employees) ? req.body.employees : null;
  if (!rows) return res.status(400).json({ error: 'Ожидался массив employees' });

  const stmt = insertEmployee();
  const ids: string[] = [];
  db.transaction(() => {
    for (const e of rows) {
      const newId = e.id || newEmployeeId();
      stmt.run(newId, e.fullName, e.position, e.department, e.status, e.hireDate, e.tabNumber ?? null, e.birthDate ?? null, e.paymentType ?? 'salary', e.salary ?? 0, e.rate ?? 1);
      ids.push(newId);
    }
  })();

  res.json({ ids });
});

app.put('/api/employees/:id', (req, res) => {
  const { fullName, position, department, status, hireDate, tabNumber, birthDate, paymentType, salary, rate } = req.body;
  db.prepare('UPDATE employees SET full_name = ?, position = ?, department = ?, status = ?, hire_date = ?, tab_number = ?, birth_date = ?, payment_type = ?, salary = ?, rate = ? WHERE id = ?')
    .run(fullName, position, department, status, hireDate, tabNumber ?? null, birthDate, paymentType, salary, rate, req.params.id);
  res.json({ success: true });
});

app.delete('/api/employees/:id', (req, res) => {
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// API Departments
app.get('/api/departments', (req, res) => {
  const deps = db.prepare('SELECT * FROM departments').all().map((d: any) => ({
    id: d.id, name: d.name, parentId: d.parent_id
  }));
  res.json(deps);
});
app.post('/api/departments', (req, res) => {
  const { id, name, parentId } = req.body;
  const newId = id || Math.random().toString(36).substring(7);
  db.prepare('INSERT INTO departments (id, name, parent_id) VALUES (?, ?, ?)').run(newId, name, parentId || null);
  res.json({ id: newId });
});
app.put('/api/departments/:id', (req, res) => {
  db.prepare('UPDATE departments SET name = ?, parent_id = ? WHERE id = ?').run(req.body.name, req.body.parentId || null, req.params.id);
  res.json({ success: true });
});
app.delete('/api/departments/:id', (req, res) => {
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// API Positions
app.get('/api/positions', (req, res) => {
  const pos = db.prepare('SELECT * FROM positions').all().map((p: any) => ({
    id: p.id, departmentId: p.department_id, title: p.title, maxCount: p.max_count, salary: p.salary
  }));
  res.json(pos);
});
app.post('/api/positions', (req, res) => {
  const { id, departmentId, title, maxCount, salary } = req.body;
  const newId = id || Math.random().toString(36).substring(7);
  db.prepare('INSERT INTO positions (id, department_id, title, max_count, salary) VALUES (?, ?, ?, ?, ?)').run(newId, departmentId, title, maxCount, salary);
  res.json({ id: newId });
});
app.put('/api/positions/:id', (req, res) => {
  const { departmentId, title, maxCount, salary } = req.body;
  db.prepare('UPDATE positions SET department_id = ?, title = ?, max_count = ?, salary = ? WHERE id = ?').run(departmentId, title, maxCount, salary, req.params.id);
  res.json({ success: true });
});
app.delete('/api/positions/:id', (req, res) => {
  db.prepare('DELETE FROM positions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// API Templates
app.get('/api/templates', (req, res) => {
  const templates = db.prepare('SELECT * FROM templates').all().map((t: any) => ({
    id: t.id,
    name: t.name,
    blocks: JSON.parse(t.blocks)
  }));
  res.json(templates);
});

app.post('/api/templates', (req, res) => {
  const { id, name, blocks } = req.body;
  const newId = id || Math.random().toString(36).substring(7);
  db.prepare('INSERT INTO templates (id, name, blocks) VALUES (?, ?, ?)')
    .run(newId, name, JSON.stringify(blocks));
  res.json({ id: newId });
});

app.put('/api/templates/:id', (req, res) => {
  const { name, blocks } = req.body;
  db.prepare('UPDATE templates SET name = ?, blocks = ? WHERE id = ?')
    .run(name, JSON.stringify(blocks), req.params.id);
  res.json({ success: true });
});

app.delete('/api/templates/:id', (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// API Timesheets
app.get('/api/timesheets', (req, res) => {
  const timesheets = db.prepare('SELECT * FROM timesheets').all().map((t: any) => ({
    id: t.id,
    year: t.year,
    month: t.month,
    employeeId: t.employee_id,
    days: JSON.parse(t.days)
  }));
  res.json(timesheets);
});

app.post('/api/timesheets', (req, res) => {
  const { id, year, month, employeeId, days } = req.body;
  const newId = id || Math.random().toString(36).substring(7);
  db.prepare('INSERT INTO timesheets (id, year, month, employee_id, days) VALUES (?, ?, ?, ?, ?)')
    .run(newId, year, month, employeeId, JSON.stringify(days));
  res.json({ id: newId });
});

app.put('/api/timesheets/:id', (req, res) => {
  const { year, month, employeeId, days } = req.body;
  db.prepare('UPDATE timesheets SET year = ?, month = ?, employee_id = ?, days = ? WHERE id = ?')
    .run(year, month, employeeId, JSON.stringify(days), req.params.id);
  res.json({ success: true });
});

app.delete('/api/timesheets/:id', (req, res) => {
  db.prepare('DELETE FROM timesheets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});


// API Archives
app.get('/api/archives', (req, res) => {
  const archives = db.prepare('SELECT * FROM archives').all().map((a: any) => ({
    id: a.id,
    year: a.year,
    month: a.month,
    employeeId: a.employee_id,
    employeeName: a.employee_name,
    department: a.department,
    position: a.position,
    salary: a.salary,
    hoursWorked: a.hours_worked
  }));
  res.json(archives);
});

app.post('/api/archives', (req, res) => {
  const { id, year, month, employeeId, employeeName, department, position, salary, hoursWorked } = req.body;
  const newId = id || Math.random().toString(36).substring(7);
  db.prepare('INSERT INTO archives (id, year, month, employee_id, employee_name, department, position, salary, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(newId, year, month, employeeId, employeeName, department, position, salary, hoursWorked);
  res.json({ id: newId });
});

app.delete('/api/archives/:id', (req, res) => {
  db.prepare('DELETE FROM archives WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Vite / Static setup
export async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// HR_NO_AUTOSTART=1 — импорт без запуска слушателя (используется API-тестами).
if (process.env.HR_NO_AUTOSTART !== '1') {
  startServer();
}
