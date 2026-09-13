/**
 * Что кадровая операция меняет в карточке сотрудника.
 *
 * Логика одна на обе ветки доступа к данным: и веб-сервер, и нативный режим
 * импортируют её отсюда. Если бы каждый считал патч сам, «перевод» в двух
 * режимах со временем стал бы означать разное.
 */
import type { Employee, Movement } from './types';

/** Колонки employees, которые может менять проведение операции. */
export const EMPLOYEE_COLUMNS: Record<string, string> = {
  position: 'position',
  department: 'department',
  status: 'status',
  hireDate: 'hire_date',
  salary: 'salary',
};

export function employeePatchFor(movement: Pick<Movement, 'type' | 'date' | 'toPosition' | 'toDepartment' | 'toSalary'>): Partial<Employee> {
  const patch: Partial<Employee> = {};

  if (movement.type === 'hire') {
    patch.status = 'active';
    patch.hireDate = movement.date;
  }

  if (movement.type === 'dismissal') {
    // Карточка сотрудника не удаляется: история, табели и архив на неё ссылаются.
    patch.status = 'dismissed';
    return patch;
  }

  if (movement.toPosition) patch.position = movement.toPosition;
  if (movement.toDepartment) patch.department = movement.toDepartment;
  if (typeof movement.toSalary === 'number' && movement.toSalary > 0) patch.salary = movement.toSalary;

  return patch;
}

/** SET-часть UPDATE employees по патчу. Возвращает null, если менять нечего. */
export function employeeUpdate(patch: Partial<Employee>): { assignments: string; values: unknown[] } | null {
  const entries = Object.entries(patch).filter(([field]) => EMPLOYEE_COLUMNS[field] !== undefined);
  if (entries.length === 0) return null;

  return {
    assignments: entries.map(([field]) => `${EMPLOYEE_COLUMNS[field]} = ?`).join(', '),
    values: entries.map(([, value]) => value),
  };
}
