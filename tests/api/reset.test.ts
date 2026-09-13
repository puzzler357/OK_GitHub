// Первой строкой: модуль подменяет DB_PATH до загрузки серверных модулей.
import './resetDbPath';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, startApi, stopApi, ensureOwner, OWNER_EMAIL, OWNER_PASSWORD } from './helpers';
import { SEEDED_ENTITIES } from '../../src/data/entities';

// Файл работает на собственной базе (см. resetDbPath.ts): он чистит все
// таблицы, а посев выполняется один раз за жизнь файла БД. На общей базе он
// ломал бы любой тест, выполненный после него, — а порядок файлов vitest не
// гарантирует, сортировка идёт по размеру, не по имени.

const EMAIL = OWNER_EMAIL;
const PASSWORD = OWNER_PASSWORD;

beforeAll(async () => {
  await startApi();
  await ensureOwner();
});
afterAll(stopApi);

describe('резервное копирование', () => {
  it('копия содержит таблицы данных и не содержит учётных записей', async () => {
    const { status, body } = await api('GET', '/api/backup');

    expect(status).toBe(200);
    expect(body.version).toBe(1);
    expect(Array.isArray(body.data.employees)).toBe(true);
    expect(body.data.employees.length).toBeGreaterThan(0);
    // users в копию не входит: восстановление чужой копии подменило бы пароль.
    expect(body.data.users).toBeUndefined();
  });

  it('восстановление возвращает данные, удалённые после снятия копии', async () => {
    const backup = (await api('GET', '/api/backup')).body;
    const before = (await api('GET', '/api/employees')).body.length;

    const created = await api('POST', '/api/employees', {
      fullName: 'Лишний Сотрудник', position: 'QA', department: 'IT', status: 'active', hireDate: '2026-05-01',
    });
    expect((await api('GET', '/api/employees')).body.length).toBe(before + 1);

    const restored = await api('POST', '/api/backup/restore', backup);
    expect(restored.status).toBe(200);

    const after = (await api('GET', '/api/employees')).body;
    expect(after.length).toBe(before);
    expect(after.find((e: any) => e.id === created.body.id)).toBeUndefined();
  });

  it('отклоняет файл, не похожий на копию', async () => {
    expect((await api('POST', '/api/backup/restore', { что: 'попало' })).status).toBe(400);
    expect((await api('POST', '/api/backup/restore', { data: { неизвестно: [] } })).status).toBe(400);
  });
});

describe('очистка отдельных модулей', () => {
  it('чистит только выбранные таблицы и требует пароль', async () => {
    expect((await api('POST', '/api/reset/tables', { adminPassword: 'wrong', tables: ['candidates'] })).status).toBe(401);

    const employeesBefore = (await api('GET', '/api/employees')).body.length;
    expect((await api('GET', '/api/candidates')).body.length).toBeGreaterThan(0);

    const { status, body } = await api('POST', '/api/reset/tables', {
      adminPassword: PASSWORD,
      tables: ['candidates', 'неизвестная_таблица'],
    });
    expect(status).toBe(200);
    expect(body.cleared).toEqual(['candidates']);

    expect((await api('GET', '/api/candidates')).body).toEqual([]);
    // Соседние таблицы не тронуты — в этом весь смысл выборочной очистки.
    expect((await api('GET', '/api/employees')).body.length).toBe(employeesBefore);

    // Возвращаем строку: следующий тест проверяет, что полный сброс чистит
    // непустые таблицы, и пустая candidates обесценила бы проверку.
    await api('POST', '/api/candidates', {
      fullName: 'Кандидат После Очистки', position: 'QA', status: 'new', createdAt: '2026-05-01',
    });
  });

  it('отклоняет запрос без известных таблиц', async () => {
    const { status } = await api('POST', '/api/reset/tables', { adminPassword: PASSWORD, tables: ['users'] });
    expect(status).toBe(400);
  });
});

describe('POST /api/auth/reset-system', () => {
  it('не чистит базу при неверном пароле администратора', async () => {
    const before = (await api('GET', '/api/employees')).body.length;

    const { status } = await api('POST', '/api/auth/reset-system', { adminPassword: 'not-my-password' });
    expect(status).toBe(401);

    expect((await api('GET', '/api/employees')).body.length).toBe(before);
  });

  it('очищает все таблицы данных, а не только сотрудников и шаблоны', async () => {
    // Кладём по записи в каждую таблицу, чтобы проверять именно полноту сброса.
    await api('POST', '/api/employees', {
      fullName: 'Сброс Тест', position: 'Инженер', department: 'IT', status: 'active', hireDate: '2026-01-01',
    });
    await api('POST', '/api/departments', { name: 'Отдел перед сбросом', parentId: null });
    await api('POST', '/api/positions', { departmentId: 'd2', title: 'Должность перед сбросом', maxCount: 1, salary: 1000 });
    await api('POST', '/api/templates', { name: 'Шаблон перед сбросом', blocks: [] });
    await api('POST', '/api/timesheets', { year: 2026, month: 1, employeeId: '1', days: { 1: 8 } });
    await api('POST', '/api/archives', {
      year: 2026, month: 1, employeeId: '1', employeeName: 'Сброс Тест',
      department: 'IT', position: 'Инженер', salary: 1000, hoursWorked: 160,
    });

    // Таблицы экранов подбора, отпусков и прочих тоже должны очищаться —
    // они наполняются посевом и попадают в RESETTABLE_TABLES.
    const routes = [
      '/api/employees', '/api/departments', '/api/positions', '/api/templates', '/api/timesheets', '/api/archives',
      ...SEEDED_ENTITIES.map((e) => `/api/${e.route}`),
    ];
    for (const route of routes) {
      expect((await api('GET', route)).body.length).toBeGreaterThan(0);
    }

    const { status } = await api('POST', '/api/auth/reset-system', { adminPassword: PASSWORD });
    expect(status).toBe(200);

    for (const route of routes) {
      if (route === '/api/audit-log') continue;
      expect((await api('GET', route)).body).toEqual([]);
    }

    // Журнал тоже очищается, но сам факт сброса в него сразу записывается —
    // иначе самое значимое действие в системе не оставляло бы следа.
    const journal = (await api('GET', '/api/audit-log')).body;
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ action: 'reset', entity: 'system' });
  });

  it('учётная запись владельца переживает сброс', async () => {
    // Иначе после сброса в приложение было бы не войти.
    const { status, body } = await api('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });

    expect(status).toBe(200);
    expect(body.user).toMatchObject({ email: EMAIL, role: 'ADMIN' });
  });
});
