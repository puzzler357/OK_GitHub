// Единый слой доступа к данным.
// В нативном приложении (Tauri) работает напрямую с локальной SQLite,
// в вебе (dev через браузер) — с локальным Express-бэкендом по /api.
import * as tauri from './tauriDb';
import type {
  Employee, Department, Position, TimesheetRecord, ArchiveRecord, Template, LoginResult,
} from './types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const rid = () => Math.random().toString(36).substring(7);

async function jsonOrThrow(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

// ---- Employees ----
export const listEmployees = (): Promise<Employee[]> =>
  isTauri ? tauri.listEmployees() : fetch('/api/employees').then((r) => r.json());

export const createEmployee = (emp: Omit<Employee, 'id'> & { id?: string }): Promise<{ id: string }> => {
  if (isTauri) return tauri.createEmployee(emp);
  const id = emp.id || rid();
  return fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...emp, id }) })
    .then((r) => r.json()).then(() => ({ id }));
};

export const updateEmployee = (id: string, data: Partial<Employee>): Promise<void> => {
  if (isTauri) return tauri.updateEmployeeRow(id, data);
  return fetch(`/api/employees/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(() => undefined);
};

export const deleteEmployee = (id: string): Promise<void> =>
  isTauri ? tauri.deleteEmployeeRow(id) : fetch(`/api/employees/${id}`, { method: 'DELETE' }).then(() => undefined);

// ---- Departments ----
export const listDepartments = (): Promise<Department[]> =>
  isTauri ? tauri.listDepartments() : fetch('/api/departments').then((r) => r.json());

export const createDepartment = (dep: Omit<Department, 'id'>): Promise<{ id: string }> =>
  isTauri ? tauri.createDepartment(dep)
    : fetch('/api/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dep) }).then(jsonOrThrow);

export const updateDepartment = (id: string, data: Partial<Department>): Promise<void> =>
  isTauri ? tauri.updateDepartmentRow(id, data)
    : fetch(`/api/departments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(jsonOrThrow).then(() => undefined);

export const deleteDepartment = (id: string): Promise<void> =>
  isTauri ? tauri.deleteDepartmentRow(id)
    : fetch(`/api/departments/${id}`, { method: 'DELETE' }).then(jsonOrThrow).then(() => undefined);

// ---- Positions ----
export const listPositions = (): Promise<Position[]> =>
  isTauri ? tauri.listPositions() : fetch('/api/positions').then((r) => r.json());

export const createPosition = (pos: Omit<Position, 'id'>): Promise<{ id: string }> =>
  isTauri ? tauri.createPosition(pos)
    : fetch('/api/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pos) }).then(jsonOrThrow);

export const updatePosition = (id: string, data: Partial<Position>): Promise<void> =>
  isTauri ? tauri.updatePositionRow(id, data)
    : fetch(`/api/positions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(jsonOrThrow).then(() => undefined);

export const deletePosition = (id: string): Promise<void> =>
  isTauri ? tauri.deletePositionRow(id)
    : fetch(`/api/positions/${id}`, { method: 'DELETE' }).then(jsonOrThrow).then(() => undefined);

// ---- Templates ----
export const listTemplates = (): Promise<Template[]> =>
  isTauri ? tauri.listTemplates() : fetch('/api/templates').then((r) => r.json());

export const createTemplate = (tpl: Omit<Template, 'id'> & { id?: string }): Promise<{ id: string }> => {
  if (isTauri) return tauri.createTemplate(tpl);
  const id = tpl.id || rid();
  return fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tpl, id }) })
    .then((r) => r.json()).then(() => ({ id }));
};

export const updateTemplate = (id: string, data: Partial<Template>): Promise<void> =>
  isTauri ? tauri.updateTemplateRow(id, data)
    : fetch(`/api/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(() => undefined);

export const deleteTemplate = (id: string): Promise<void> =>
  isTauri ? tauri.deleteTemplateRow(id) : fetch(`/api/templates/${id}`, { method: 'DELETE' }).then(() => undefined);

// ---- Timesheets ----
export const listTimesheets = (): Promise<TimesheetRecord[]> =>
  isTauri ? tauri.listTimesheets() : fetch('/api/timesheets').then((r) => r.json());

export const createTimesheet = (rec: Omit<TimesheetRecord, 'id'> & { id?: string }): Promise<{ id: string }> => {
  if (isTauri) return tauri.createTimesheet(rec);
  const id = rec.id || rid();
  return fetch('/api/timesheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rec, id }) })
    .then((r) => r.json()).then(() => ({ id }));
};

export const updateTimesheet = (id: string, data: Partial<TimesheetRecord>): Promise<void> =>
  isTauri ? tauri.updateTimesheetRow(id, data)
    : fetch(`/api/timesheets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(() => undefined);

export const deleteTimesheet = (id: string): Promise<void> =>
  isTauri ? tauri.deleteTimesheetRow(id) : fetch(`/api/timesheets/${id}`, { method: 'DELETE' }).then(() => undefined);

// ---- Archives ----
export const listArchives = (): Promise<ArchiveRecord[]> =>
  isTauri ? tauri.listArchives() : fetch('/api/archives').then((r) => r.json());

export const createArchive = (rec: Omit<ArchiveRecord, 'id'> & { id?: string }): Promise<{ id: string }> => {
  if (isTauri) return tauri.createArchive(rec);
  const id = rec.id || rid();
  return fetch('/api/archives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rec, id }) })
    .then((r) => r.json()).then(() => ({ id }));
};

export const deleteArchive = (id: string): Promise<void> =>
  isTauri ? tauri.deleteArchiveRow(id) : fetch(`/api/archives/${id}`, { method: 'DELETE' }).then(() => undefined);

// ---- Auth ----
export const login = (email: string, password: string): Promise<LoginResult> =>
  isTauri ? tauri.login(email, password)
    : fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(jsonOrThrow);

export const changePassword = (email: string, currentPassword: string, newPassword: string): Promise<void> =>
  isTauri ? tauri.changePassword(email, currentPassword, newPassword)
    : fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, currentPassword, newPassword }) }).then(jsonOrThrow).then(() => undefined);

export const resetSystem = (adminPassword: string): Promise<void> =>
  isTauri ? tauri.resetSystem(adminPassword)
    : fetch('/api/auth/reset-system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword }) }).then(jsonOrThrow).then(() => undefined);
