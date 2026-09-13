import { useTranslation } from 'react-i18next';
import { X, ArrowRight } from 'lucide-react';
import { useMoney } from '../lib/money';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { Employee, Movement } from '../store/useDatabaseStore';
import { clickable } from '../lib/a11y';

/**
 * Лента кадровых событий по сотруднику.
 *
 * Источник — таблица movements: каждая запись создаётся вместе с изменением
 * карточки одной транзакцией, поэтому лента показывает ровно то, что
 * действительно произошло, а не отдельный журнал, который мог бы разойтись
 * с состоянием сотрудника.
 */
export default function EmployeeHistory({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { t } = useTranslation();
  const { movements } = useDatabaseStore();
  const money = useMoney();

  const items = movements
    .filter(m => m.employeeId === employee.id)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const typeLabel = (type: Movement['type']) =>
    type === 'hire' ? t('movements.hire') : type === 'transfer' ? t('movements.transfer') : t('movements.dismissal');

  const dotClass = (type: Movement['type']) =>
    type === 'hire' ? 'bg-emerald-500' : type === 'transfer' ? 'bg-accent-500' : 'bg-rose-500';

  const change = (label: string, from?: string | number, to?: string | number) => {
    if (from === undefined && to === undefined) return null;
    if (String(from ?? '') === String(to ?? '')) return null;
    return (
      <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
        <span>{label}:</span>
        <span>{from === undefined || from === '' ? '—' : from}</span>
        <ArrowRight className="w-3 h-3 text-accent-400" />
        <span className="text-secondary">{to === undefined || to === '' ? '—' : to}</span>
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="absolute inset-0 bg-surface backdrop-blur-sm transition-opacity" {...clickable(onClose, t('common.close'))} />

      <div className="relative w-full max-w-md bg-[var(--sidebar-bg)] border-l border-[var(--border-color)] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('movements.history')}</h2>
            <p className="text-sm text-muted mt-1">{employee.fullName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-hover text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted text-center py-12">{t('movements.noHistory')}</p>
          ) : (
            <div className="relative pl-4 border-l-2 border-line space-y-6">
              {items.map(m => (
                <div key={m.id} className="relative">
                  <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full ring-4 ring-[var(--sidebar-bg)] ${dotClass(m.type)}`} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-primary">{typeLabel(m.type)}</p>
                    <span className="text-xs text-muted whitespace-nowrap">{m.date}</span>
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {m.type !== 'dismissal' && change(t('employees.col.position'), m.fromPosition, m.toPosition)}
                    {m.type !== 'dismissal' && change(t('employees.col.department'), m.fromDepartment, m.toDepartment)}
                    {m.type !== 'dismissal' && m.toSalary > 0
                      && change(t('employees.col.salary'), money.format(m.fromSalary), money.format(m.toSalary))}
                    {m.orderNo && <p className="text-xs text-muted">{t('movements.orderNo')}: {m.orderNo}</p>}
                    {m.reason && <p className="text-xs text-secondary mt-1">{m.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
