import type { Employee } from '../data/types';

/**
 * Расчётная логика по оплате труда.
 *
 * Вынесена из компонентов: пока она жила внутри Dashboard, проверить её было
 * нечем, и в ней спокойно сидела подстановка 85 000 рублей каждому сотруднику
 * без оклада — выдуманные деньги в отчётной цифре.
 */

/** Месячная стоимость сотрудника: оклад × ставка. */
export function employeeCost(employee: Pick<Employee, 'salary' | 'rate'>): number {
  const salary = employee.salary ?? 0;
  // Пустая ставка означает полную занятость, пустой оклад — что его не задали,
  // и придумывать за пользователя число мы не имеем права.
  const rate = employee.rate ?? 1;
  return salary * rate;
}

/** Фонд оплаты труда: сумма по всем переданным сотрудникам. */
export function payrollTotal(employees: Pick<Employee, 'salary' | 'rate'>[]): number {
  return employees.reduce((sum, employee) => sum + employeeCost(employee), 0);
}

/** Сколько сотрудников учтено в ФОТ, а сколько осталось без оклада. */
export function payrollCoverage(employees: Pick<Employee, 'salary' | 'rate'>[]): { withSalary: number; withoutSalary: number } {
  let withSalary = 0;
  for (const employee of employees) {
    if ((employee.salary ?? 0) > 0) withSalary += 1;
  }
  return { withSalary, withoutSalary: employees.length - withSalary };
}
