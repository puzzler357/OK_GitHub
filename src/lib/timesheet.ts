/**
 * Расчёт итогов табеля.
 *
 * Логика жила прямо в разметке экрана и повторялась в выгрузке — здесь она
 * одна и покрыта тестами. Буквенные коды формы Т-13 не переводятся: это
 * доменный стандарт, а не подпись интерфейса.
 */

export interface AttendanceCode {
  /** Часов за день по этому коду. */
  hours: number;
  /** Считается ли день отработанным. */
  worked: boolean;
  /** Классы оформления ячейки. */
  color: string;
}

export const ATTENDANCE_CODES: Record<string, AttendanceCode> = {
  'Я': { hours: 8, worked: true, color: 'text-primary' },
  'В': { hours: 0, worked: false, color: 'text-rose-400 bg-rose-500/10' },
  'ОТ': { hours: 0, worked: false, color: 'text-blue-400 bg-blue-500/10' },
  'Б': { hours: 0, worked: false, color: 'text-amber-400 bg-amber-500/10' },
  'К': { hours: 8, worked: true, color: 'text-emerald-400 bg-emerald-500/10' },
  'ОГ': { hours: 0, worked: false, color: 'text-teal-400 bg-teal-500/10' },
  'ВМ': { hours: 11, worked: true, color: 'text-orange-400 bg-orange-500/10' },
  'МВ': { hours: 0, worked: false, color: 'text-indigo-400 bg-indigo-500/10' },
  'НН': { hours: 0, worked: false, color: 'text-purple-400 bg-purple-500/10' },
  'ПР': { hours: 0, worked: false, color: 'text-rose-500 bg-rose-500/20' },
};

export const WEEKEND_CODE = 'В';
export const DEFAULT_WORK_CODE = 'Я';

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(year, month, day).getDay();
  return weekday === 0 || weekday === 6;
}

/**
 * Код дня с учётом умолчания: незаполненный день считается выходным по
 * календарю и явкой в остальных случаях. Именно это правило показывает экран,
 * поэтому итоги обязаны считаться по нему же.
 */
export function codeForDay(days: Record<number, string>, year: number, month: number, day: number): string {
  const explicit = days[day];
  if (explicit !== undefined && explicit !== '') return explicit;
  return isWeekend(year, month, day) ? WEEKEND_CODE : DEFAULT_WORK_CODE;
}

export interface TimesheetTotals {
  /** Дни, засчитанные как отработанные. */
  workDays: number;
  /** Явки — подмножество отработанных, без командировок. */
  attendances: number;
  /** Сумма часов. */
  hours: number;
}

export function timesheetTotals(days: Record<number, string>, year: number, month: number): TimesheetTotals {
  const total = daysInMonth(year, month);
  let workDays = 0;
  let attendances = 0;
  let hours = 0;

  for (let day = 1; day <= total; day += 1) {
    const code = codeForDay(days, year, month, day);
    const info = ATTENDANCE_CODES[code];
    if (!info?.worked) continue;

    workDays += 1;
    hours += info.hours;
    // Командировка (К) — отработанный день, но не явка на рабочем месте.
    if (code !== 'К') attendances += 1;
  }

  return { workDays, attendances, hours };
}
