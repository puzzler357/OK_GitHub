// Первой строкой: модуль подменяет DB_PATH до загрузки серверных модулей.
import './resetDbPath';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, startApi, stopApi } from './helpers';
import { ENTITIES } from '../../src/data/entities';

// Файл работает на собственной базе (см. resetDbPath.ts): он чистит все
// таблицы, а посев выполняется один раз за жизнь файла БД. На общей базе он
// ломал бы любой тест, выполненный после него, — а порядок файлов vitest не
// гарантирует, сортировка идёт по размеру, не по имени.

const EMAIL = 'admin@global.tech';
const PASSWORD = 'password123';

beforeAll(async () => {
  await startApi();
});
afterAll(stopApi);

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
      ...ENTITIES.map((e) => `/api/${e.route}`),
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
