import type { Department, Employee, Position } from '../data/types';

/**
 * Занятость штатных единиц.
 *
 * Логика лежала внутри OrgChart и Reports в двух слегка разных вариантах —
 * разойтись им было нечем помешать. Здесь она одна.
 */

export interface PositionStat {
  positionId: string;
  title: string;
  department: string;
  /** Штатных единиц по расписанию. */
  total: number;
  occupied: number;
  vacant: number;
  salary: number;
}

/**
 * Занято ли место: сотрудник считается занимающим должность, если совпадают
 * название должности и подразделение. При просмотре «по всей компании»
 * подразделение не учитывается — иначе одноимённые должности в разных
 * отделах схлопнулись бы в одну.
 */
export function positionStats(
  positions: Position[],
  employees: Employee[],
  departments: Department[],
  scopeDepartmentId?: string | null,
): PositionStat[] {
  const departmentName = (id: string) => departments.find(d => d.id === id)?.name ?? '';
  const scoped = scopeDepartmentId
    ? positions.filter(p => p.departmentId === scopeDepartmentId)
    : positions;

  return scoped.map((position) => {
    const depName = departmentName(position.departmentId);
    const occupied = employees.filter((employee) => {
      if (employee.position !== position.title) return false;
      // Уволенные штатную единицу не занимают.
      if (employee.status === 'dismissed') return false;
      if (!scopeDepartmentId) return true;
      return employee.department === depName;
    }).length;

    return {
      positionId: position.id,
      title: position.title,
      department: depName,
      total: position.maxCount,
      occupied,
      vacant: Math.max(0, position.maxCount - occupied),
      salary: position.salary,
    };
  }).sort((a, b) => b.total - a.total);
}

export function staffingSummary(stats: PositionStat[]): { total: number; occupied: number; vacant: number } {
  const total = stats.reduce((sum, s) => sum + s.total, 0);
  const occupied = stats.reduce((sum, s) => sum + s.occupied, 0);
  return { total, occupied, vacant: Math.max(0, total - occupied) };
}
