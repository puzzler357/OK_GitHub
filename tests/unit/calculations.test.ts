import { describe, expect, it } from 'vitest';
import { employeeCost, payrollCoverage, payrollTotal } from '../../src/lib/payroll';
import { ATTENDANCE_CODES, codeForDay, daysInMonth, isWeekend, timesheetTotals } from '../../src/lib/timesheet';
import { positionStats, staffingSummary } from '../../src/lib/staffing';
import { canonicalName, extractVariables, renderTemplate } from '../../src/lib/templateVars';
import type { Department, Employee, Position } from '../../src/data/types';

const employee = (over: Partial<Employee> = {}): Employee => ({
  id: 'e1', fullName: 'Тест', position: 'Инженер', department: 'IT',
  status: 'active', hireDate: '2024-01-01', ...over,
});

describe('фонд оплаты труда', () => {
  it('считает оклад с учётом ставки', () => {
    expect(employeeCost({ salary: 10000, rate: 0.5 })).toBe(5000);
    expect(employeeCost({ salary: 10000, rate: 1.5 })).toBe(15000);
  });

  it('пустая ставка означает полную занятость', () => {
    expect(employeeCost({ salary: 10000, rate: undefined })).toBe(10000);
  });

  it('сотрудник без оклада добавляет ноль, а не выдуманную сумму', () => {
    // Прежний расчёт подставлял 85 000 каждому, у кого оклад не задан,
    // и эта сумма попадала в отчётную цифру ФОТ.
    expect(employeeCost({ salary: undefined, rate: 1 })).toBe(0);
    expect(payrollTotal([{ salary: 10000, rate: 1 }, { salary: undefined, rate: 1 }])).toBe(10000);
  });

  it('показывает, по скольким сотрудникам оклад вообще известен', () => {
    const coverage = payrollCoverage([{ salary: 100, rate: 1 }, { salary: 0, rate: 1 }, { rate: 1 }]);
    expect(coverage).toEqual({ withSalary: 1, withoutSalary: 2 });
  });

  it('пустой список даёт ноль, а не ошибку', () => {
    expect(payrollTotal([])).toBe(0);
  });
});

describe('итоги табеля', () => {
  // Март 2026: 31 день, 1 марта — воскресенье.
  const YEAR = 2026;
  const MARCH = 2;

  it('знает длину месяца, включая февраль високосного года', () => {
    expect(daysInMonth(YEAR, MARCH)).toBe(31);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
  });

  it('определяет выходные по календарю', () => {
    expect(isWeekend(YEAR, MARCH, 1)).toBe(true);
    expect(isWeekend(YEAR, MARCH, 2)).toBe(false);
  });

  it('незаполненный день берёт значение по календарю', () => {
    expect(codeForDay({}, YEAR, MARCH, 1)).toBe('В');
    expect(codeForDay({}, YEAR, MARCH, 2)).toBe('Я');
    expect(codeForDay({ 1: 'Я' }, YEAR, MARCH, 1)).toBe('Я');
  });

  it('считает дни и часы по автозаполненному месяцу', () => {
    const totals = timesheetTotals({}, YEAR, MARCH);
    // В марте 2026 — 22 рабочих дня по календарю.
    expect(totals.workDays).toBe(22);
    expect(totals.attendances).toBe(22);
    expect(totals.hours).toBe(22 * 8);
  });

  it('отпуск и больничный не считаются отработанными днями', () => {
    const totals = timesheetTotals({ 2: 'ОТ', 3: 'Б' }, YEAR, MARCH);
    expect(totals.workDays).toBe(20);
    expect(totals.hours).toBe(20 * 8);
  });

  it('командировка — отработанный день, но не явка', () => {
    const totals = timesheetTotals({ 2: 'К' }, YEAR, MARCH);
    expect(totals.workDays).toBe(22);
    expect(totals.attendances).toBe(21);
  });

  it('вахта считается по своей длительности', () => {
    const totals = timesheetTotals({ 2: 'ВМ' }, YEAR, MARCH);
    expect(totals.hours).toBe(21 * 8 + 11);
  });

  it('работа в выходной увеличивает итог', () => {
    const totals = timesheetTotals({ 1: 'Я' }, YEAR, MARCH);
    expect(totals.workDays).toBe(23);
  });

  it('неизвестный код не ломает расчёт', () => {
    const totals = timesheetTotals({ 2: 'ЧТО-ТО' }, YEAR, MARCH);
    expect(totals.workDays).toBe(21);
    expect(ATTENDANCE_CODES['ЧТО-ТО']).toBeUndefined();
  });
});

describe('занятость штатных единиц', () => {
  const departments: Department[] = [
    { id: 'd1', name: 'IT', parentId: null },
    { id: 'd2', name: 'Продажи', parentId: null },
  ];
  const positions: Position[] = [
    { id: 'p1', departmentId: 'd1', title: 'Инженер', maxCount: 3, salary: 100 },
    { id: 'p2', departmentId: 'd2', title: 'Инженер', maxCount: 2, salary: 90 },
  ];

  it('считает занятые и вакантные места по подразделению', () => {
    const employees = [
      employee({ id: '1', position: 'Инженер', department: 'IT' }),
      employee({ id: '2', position: 'Инженер', department: 'IT' }),
      employee({ id: '3', position: 'Инженер', department: 'Продажи' }),
    ];

    const [it] = positionStats(positions, employees, departments, 'd1');
    expect(it).toMatchObject({ total: 3, occupied: 2, vacant: 1 });
  });

  it('уволенные штатную единицу не занимают', () => {
    const employees = [
      employee({ id: '1', position: 'Инженер', department: 'IT' }),
      employee({ id: '2', position: 'Инженер', department: 'IT', status: 'dismissed' }),
    ];

    const [it] = positionStats(positions, employees, departments, 'd1');
    expect(it.occupied).toBe(1);
  });

  it('вакансий не бывает меньше нуля при переборе людей', () => {
    const employees = Array.from({ length: 5 }, (_, i) =>
      employee({ id: String(i), position: 'Инженер', department: 'IT' }));

    const [it] = positionStats(positions, employees, departments, 'd1');
    expect(it.occupied).toBe(5);
    expect(it.vacant).toBe(0);
  });

  it('сводка складывает все должности', () => {
    const employees = [employee({ id: '1', position: 'Инженер', department: 'IT' })];
    const summary = staffingSummary(positionStats(positions, employees, departments));
    expect(summary.total).toBe(5);
    expect(summary.vacant).toBe(summary.total - summary.occupied);
  });
});

describe('подстановка переменных в шаблон', () => {
  it('подставляет значения по каноническим именам', () => {
    expect(renderTemplate('Справка дана {{fullName}}', { fullName: 'Иванов И.И.' }))
      .toBe('Справка дана Иванов И.И.');
  });

  it('понимает русские синонимы имён', () => {
    expect(canonicalName('ФИО')).toBe('fullName');
    expect(renderTemplate('{{Должность}}', { position: 'Инженер' })).toBe('Инженер');
  });

  it('терпит пробелы внутри скобок', () => {
    expect(renderTemplate('{{ fullName }}', { fullName: 'Тест' })).toBe('Тест');
  });

  it('переменная без значения остаётся видимой', () => {
    // Пустое место в документе хуже видимого маркера: маркер заметят.
    expect(renderTemplate('Оклад: {{salary}}', {})).toBe('Оклад: {{salary}}');
    expect(renderTemplate('Оклад: {{salary}}', { salary: '' })).toBe('Оклад: {{salary}}');
  });

  it('подставляет несколько вхождений одной переменной', () => {
    expect(renderTemplate('{{fullName}} и снова {{fullName}}', { fullName: 'А' })).toBe('А и снова А');
  });

  it('находит переменные в тексте', () => {
    expect(extractVariables('{{fullName}} работает в {{Отдел}}').sort())
      .toEqual(['department', 'fullName']);
  });
});
