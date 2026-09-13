import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { MovementType } from '../store/useDatabaseStore';

const movementSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  orderNo: z.string().optional(),
  toPosition: z.string().optional(),
  toDepartment: z.string().optional(),
  toSalary: z.coerce.number().min(0).optional().default(0),
  reason: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface MovementFormProps {
  type: MovementType;
  onClose: () => void;
}

/**
 * Дровер проведения кадровой операции.
 *
 * Прежние значения (должность, подразделение, оклад) форма не спрашивает —
 * их фиксирует слой данных по состоянию карточки на момент проведения.
 */
export default function MovementForm({ type, onClose }: MovementFormProps) {
  const { t } = useTranslation();
  const { employees, departments, positions, applyMovement } = useDatabaseStore();

  const isDismissal = type === 'dismissal';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: {
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      toSalary: 0,
    },
  });

  const title = type === 'hire' ? t('movements.hire') : type === 'transfer' ? t('movements.transfer') : t('movements.dismissal');

  const onSubmit = async (values: MovementFormValues) => {
    await applyMovement({
      employeeId: values.employeeId,
      type,
      date: values.date,
      // При увольнении целевые поля не заполняются: меняется только статус.
      toPosition: isDismissal ? undefined : values.toPosition || undefined,
      toDepartment: isDismissal ? undefined : values.toDepartment || undefined,
      toSalary: isDismissal ? 0 : values.toSalary ?? 0,
      orderNo: values.orderNo || undefined,
      reason: values.reason || undefined,
    });
    onClose();
  };

  const field = 'w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="absolute inset-0 bg-surface backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--sidebar-bg)] border-l border-[var(--border-color)] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-hover text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t('movements.employee')} *</label>
            <select {...register('employeeId')} className={field}>
              <option value="">—</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
            {errors.employeeId && <p className="text-rose-500 text-xs mt-1">{t('employees.form.validation.nameMin')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('movements.date')} *</label>
            <input type="date" {...register('date')} className={field} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('movements.orderNo')}</label>
            <input {...register('orderNo')} className={field} />
          </div>

          {!isDismissal && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{t('movements.newPosition')}</label>
                <input list="movement-positions" {...register('toPosition')} className={field} />
                <datalist id="movement-positions">
                  {Array.from(new Set(positions.map(p => p.title))).map(title => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('movements.newDepartment')}</label>
                <input list="movement-departments" {...register('toDepartment')} className={field} />
                <datalist id="movement-departments">
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('movements.newSalary')}</label>
                <input type="number" min="0" step="1" {...register('toSalary')} className={field} />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">{t('movements.reason')}</label>
            <textarea {...register('reason')} className={`${field} h-24 resize-none`} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('movements.apply')}
          </button>
        </form>
      </div>
    </div>
  );
}
