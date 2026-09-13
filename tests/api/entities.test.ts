import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, startApi, stopApi } from './helpers';
import { ENTITIES } from '../../src/data/entities';

beforeAll(async () => {
  await startApi();
});
afterAll(stopApi);

// Маршруты для этих таблиц строятся из описания в src/data/entities.ts.
// Тест идёт по тому же описанию: добавится сущность — проверка появится сама.
describe('таблицы экранов подбора, отпусков, онбординга, оценки и базы знаний', () => {
  it.each(ENTITIES.map((e) => [e.route, e.table]))('GET /api/%s отдаёт массив', async (route) => {
    const { status, body } = await api('GET', `/api/${route}`);

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it.each(ENTITIES.map((e) => [e.route, e]))('CRUD /api/%s', async (route, entity: any) => {
    // Значение под каждый тип колонки, чтобы не описывать тело руками.
    const payload: Record<string, unknown> = {};
    for (const c of entity.columns) {
      if (c.kind === 'bool') payload[c.field] = true;
      else if (c.kind === 'number') payload[c.field] = 7;
      else payload[c.field] = `${c.field}-значение`;
    }

    const created = await api('POST', `/api/${route}`, payload);
    expect(created.status).toBe(200);
    const id: string = created.body.id;
    expect(id).toBeTruthy();

    const row = (await api('GET', `/api/${route}`)).body.find((r: any) => r.id === id);
    expect(row).toBeTruthy();
    for (const c of entity.columns) {
      expect(row[c.field]).toEqual(payload[c.field]);
    }

    // Частичное обновление не должно затирать остальные поля: экраны меняют
    // по одному свойству за раз (перетащили карточку, поставили галочку).
    const first = entity.columns[0];
    const patched = first.kind === 'bool' ? false : first.kind === 'number' ? 42 : 'обновлено';
    await api('PUT', `/api/${route}/${id}`, { [first.field]: patched });

    const afterUpdate = (await api('GET', `/api/${route}`)).body.find((r: any) => r.id === id);
    expect(afterUpdate[first.field]).toEqual(patched);
    for (const c of entity.columns.slice(1)) {
      expect(afterUpdate[c.field]).toEqual(payload[c.field]);
    }

    expect((await api('DELETE', `/api/${route}/${id}`)).status).toBe(200);
    expect((await api('GET', `/api/${route}`)).body.find((r: any) => r.id === id)).toBeUndefined();
  });
});

describe('булевы поля', () => {
  it('done приходит булевым, а не нулём и единицей SQLite', async () => {
    const created = await api('POST', '/api/checklist-tasks', {
      employeeId: '1', kind: 'onboarding', title: 'Проверка типа', assignee: 'HR', done: false, orderIndex: 1,
    });
    const id: string = created.body.id;

    const row = (await api('GET', '/api/checklist-tasks')).body.find((r: any) => r.id === id);
    expect(row.done).toBe(false);

    await api('PUT', `/api/checklist-tasks/${id}`, { done: true });
    const toggled = (await api('GET', '/api/checklist-tasks')).body.find((r: any) => r.id === id);
    expect(toggled.done).toBe(true);
    expect(toggled.title).toBe('Проверка типа');

    await api('DELETE', `/api/checklist-tasks/${id}`);
  });
});

describe('посев экранов', () => {
  it('заполняет все семь таблиц, чтобы экраны не открывались пустыми', async () => {
    for (const entity of ENTITIES) {
      const { body } = await api('GET', `/api/${entity.route}`);
      expect(body.length, `таблица ${entity.table} пуста`).toBeGreaterThan(0);
    }
  });
});
