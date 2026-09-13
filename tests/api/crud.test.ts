import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, startApi, stopApi } from './helpers';

beforeAll(async () => {
  await startApi();
});
afterAll(stopApi);

describe('чтение справочников', () => {
  it.each([
    ['/api/employees', true],
    ['/api/departments', true],
    ['/api/positions', true],
    ['/api/templates', true],
    ['/api/timesheets', false],
    ['/api/archives', false],
  ])('GET %s отдаёт массив', async (route, mustBeSeeded) => {
    const { status, body } = await api('GET', route as string);

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    if (mustBeSeeded) expect(body.length).toBeGreaterThan(0);
  });

  it('сотрудники приходят в camelCase, а не в колонках БД', async () => {
    const { body } = await api('GET', '/api/employees');
    const [first] = body;

    expect(first).toHaveProperty('fullName');
    expect(first).toHaveProperty('hireDate');
    expect(first).not.toHaveProperty('full_name');
  });

  it('шаблоны отдаются с разобранным JSON-полем blocks', async () => {
    const { body } = await api('GET', '/api/templates');

    expect(Array.isArray(body[0].blocks)).toBe(true);
  });
});

describe('CRUD сотрудников', () => {
  it('создаёт, читает, обновляет и удаляет запись', async () => {
    const created = await api('POST', '/api/employees', {
      fullName: 'Тестов Тест Тестович',
      position: 'QA инженер',
      department: 'IT',
      status: 'active',
      hireDate: '2026-01-15',
      birthDate: '1990-05-05',
      paymentType: 'salary',
      salary: 12345,
      rate: 0.5,
    });
    expect(created.status).toBe(200);
    const id: string = created.body.id;
    expect(id).toBeTruthy();

    const afterCreate = await api('GET', '/api/employees');
    const row = afterCreate.body.find((e: any) => e.id === id);
    expect(row).toMatchObject({
      fullName: 'Тестов Тест Тестович',
      department: 'IT',
      salary: 12345,
      rate: 0.5,
    });

    await api('PUT', `/api/employees/${id}`, {
      fullName: 'Тестов Тест Обновлённый',
      position: 'QA Lead',
      department: 'IT',
      status: 'on_leave',
      hireDate: '2026-01-15',
      birthDate: '1990-05-05',
      paymentType: 'hourly',
      salary: 200,
      rate: 1,
    });

    const afterUpdate = await api('GET', '/api/employees');
    expect(afterUpdate.body.find((e: any) => e.id === id)).toMatchObject({
      fullName: 'Тестов Тест Обновлённый',
      position: 'QA Lead',
      status: 'on_leave',
      paymentType: 'hourly',
    });

    expect((await api('DELETE', `/api/employees/${id}`)).status).toBe(200);

    const afterDelete = await api('GET', '/api/employees');
    expect(afterDelete.body.find((e: any) => e.id === id)).toBeUndefined();
  });
});

describe('табельный номер', () => {
  it('сохраняется при создании, читается и меняется при обновлении', async () => {
    const created = await api('POST', '/api/employees', {
      fullName: 'Табельный Тест',
      position: 'Инженер',
      department: 'IT',
      status: 'active',
      hireDate: '2026-02-01',
      tabNumber: '7788',
    });
    const id: string = created.body.id;

    const row = (await api('GET', '/api/employees')).body.find((e: any) => e.id === id);
    expect(row.tabNumber).toBe('7788');

    await api('PUT', `/api/employees/${id}`, {
      fullName: 'Табельный Тест',
      position: 'Инженер',
      department: 'IT',
      status: 'active',
      hireDate: '2026-02-01',
      tabNumber: '9900',
    });
    expect((await api('GET', '/api/employees')).body.find((e: any) => e.id === id).tabNumber).toBe('9900');

    await api('DELETE', `/api/employees/${id}`);
  });

  it('у сотрудников без номера поле не выдумывается', async () => {
    const created = await api('POST', '/api/employees', {
      fullName: 'Без Номера',
      position: 'Стажёр',
      department: 'IT',
      status: 'probation',
      hireDate: '2026-02-01',
    });
    const id: string = created.body.id;

    const row = (await api('GET', '/api/employees')).body.find((e: any) => e.id === id);
    expect(row.tabNumber).toBeUndefined();

    await api('DELETE', `/api/employees/${id}`);
  });
});

describe('массовый импорт сотрудников', () => {
  it('POST /api/employees/bulk пишет все строки в базу', async () => {
    const before = (await api('GET', '/api/employees')).body.length;

    const rows = [
      { fullName: 'Импорт Первый', position: 'Инженер', department: 'IT', status: 'active', hireDate: '2026-01-01', tabNumber: '1001' },
      { fullName: 'Импорт Второй', position: 'Аналитик', department: 'Аналитика', status: 'active', hireDate: '2026-01-02' },
      { fullName: 'Импорт Третий', position: 'Дизайнер', department: 'Дизайн', status: 'probation', hireDate: '2026-01-03' },
    ];

    const { status, body } = await api('POST', '/api/employees/bulk', { employees: rows });
    expect(status).toBe(200);
    expect(body.ids).toHaveLength(3);

    // Главное, ради чего задача и заводилась: строки должны пережить
    // перечитывание списка, а не жить только в сторе на клиенте.
    const after = (await api('GET', '/api/employees')).body;
    expect(after.length).toBe(before + 3);

    const first = after.find((e: any) => e.id === body.ids[0]);
    expect(first).toMatchObject({ fullName: 'Импорт Первый', department: 'IT', tabNumber: '1001' });

    for (const id of body.ids) {
      await api('DELETE', `/api/employees/${id}`);
    }
    expect((await api('GET', '/api/employees')).body.length).toBe(before);
  });

  it('отклоняет тело без массива employees', async () => {
    const { status } = await api('POST', '/api/employees/bulk', { rows: [] });
    expect(status).toBe(400);
  });

  it('пустой массив не ломает запрос', async () => {
    const { status, body } = await api('POST', '/api/employees/bulk', { employees: [] });
    expect(status).toBe(200);
    expect(body.ids).toEqual([]);
  });
});

describe('CRUD оргструктуры', () => {
  it('подразделение: создание с родителем, переименование, удаление', async () => {
    const { body } = await api('POST', '/api/departments', { name: 'Тестовый отдел', parentId: 'd1' });
    const id: string = body.id;

    const list = await api('GET', '/api/departments');
    expect(list.body.find((d: any) => d.id === id)).toMatchObject({ name: 'Тестовый отдел', parentId: 'd1' });

    await api('PUT', `/api/departments/${id}`, { name: 'Отдел переименован', parentId: null });
    const renamed = (await api('GET', '/api/departments')).body.find((d: any) => d.id === id);
    expect(renamed).toMatchObject({ name: 'Отдел переименован', parentId: null });

    await api('DELETE', `/api/departments/${id}`);
    expect((await api('GET', '/api/departments')).body.find((d: any) => d.id === id)).toBeUndefined();
  });

  it('должность: создание, изменение штатной численности, удаление', async () => {
    const { body } = await api('POST', '/api/positions', {
      departmentId: 'd2',
      title: 'Тестовая должность',
      maxCount: 2,
      salary: 100000,
    });
    const id: string = body.id;

    expect((await api('GET', '/api/positions')).body.find((p: any) => p.id === id)).toMatchObject({
      departmentId: 'd2',
      maxCount: 2,
      salary: 100000,
    });

    await api('PUT', `/api/positions/${id}`, {
      departmentId: 'd2',
      title: 'Тестовая должность',
      maxCount: 7,
      salary: 150000,
    });
    expect((await api('GET', '/api/positions')).body.find((p: any) => p.id === id)).toMatchObject({
      maxCount: 7,
      salary: 150000,
    });

    await api('DELETE', `/api/positions/${id}`);
    expect((await api('GET', '/api/positions')).body.find((p: any) => p.id === id)).toBeUndefined();
  });
});

describe('CRUD шаблонов документов', () => {
  it('сохраняет и возвращает блоки шаблона без потери структуры', async () => {
    const blocks = [
      { id: 'b1', type: 'text', content: 'Справка выдана {{fullName}}' },
      { id: 'b2', type: 'signature', content: '' },
    ];

    const { body } = await api('POST', '/api/templates', { name: 'Тестовый шаблон', blocks });
    const id: string = body.id;

    const created = (await api('GET', '/api/templates')).body.find((t: any) => t.id === id);
    expect(created.blocks).toEqual(blocks);

    await api('PUT', `/api/templates/${id}`, {
      name: 'Тестовый шаблон v2',
      blocks: [...blocks, { id: 'b3', type: 'text', content: 'Дополнение' }],
    });
    const updated = (await api('GET', '/api/templates')).body.find((t: any) => t.id === id);
    expect(updated.name).toBe('Тестовый шаблон v2');
    expect(updated.blocks).toHaveLength(3);

    await api('DELETE', `/api/templates/${id}`);
    expect((await api('GET', '/api/templates')).body.find((t: any) => t.id === id)).toBeUndefined();
  });
});

describe('CRUD табеля и архива', () => {
  it('табель сохраняет карту дней и обновляет её', async () => {
    const days = { 1: 8, 2: 8, 3: 0 };

    const { body } = await api('POST', '/api/timesheets', {
      year: 2026,
      month: 3,
      employeeId: '1',
      days,
    });
    const id: string = body.id;

    const created = (await api('GET', '/api/timesheets')).body.find((t: any) => t.id === id);
    expect(created).toMatchObject({ year: 2026, month: 3, employeeId: '1' });
    expect(created.days).toEqual(days);

    await api('PUT', `/api/timesheets/${id}`, {
      year: 2026,
      month: 3,
      employeeId: '1',
      days: { ...days, 3: 4 },
    });
    const updated = (await api('GET', '/api/timesheets')).body.find((t: any) => t.id === id);
    expect(updated.days['3']).toBe(4);

    await api('DELETE', `/api/timesheets/${id}`);
    expect((await api('GET', '/api/timesheets')).body.find((t: any) => t.id === id)).toBeUndefined();
  });

  it('архив принимает закрытый период и отдаёт его обратно', async () => {
    const { body } = await api('POST', '/api/archives', {
      year: 2026,
      month: 2,
      employeeId: '1',
      employeeName: 'Иванов Иван Иванович',
      department: 'IT',
      position: 'Старший разработчик',
      salary: 500000,
      hoursWorked: 160,
    });
    const id: string = body.id;

    expect((await api('GET', '/api/archives')).body.find((a: any) => a.id === id)).toMatchObject({
      year: 2026,
      month: 2,
      employeeName: 'Иванов Иван Иванович',
      hoursWorked: 160,
    });

    await api('DELETE', `/api/archives/${id}`);
    expect((await api('GET', '/api/archives')).body.find((a: any) => a.id === id)).toBeUndefined();
  });
});
