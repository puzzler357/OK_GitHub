import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clickable } from '../lib/a11y';

// Схема только для вывода типа формы; сообщения валидации задаются
// локализованной схемой внутри компонента (см. localizedSchema).
const employeeSchema = z.object({
  fullName: z.string().min(2),
  position: z.string().min(2),
  department: z.string().min(2),
  status: z.enum(['active', 'on_leave', 'probation', 'dismissed']),
  hireDate: z.string().min(1),
  tabNumber: z.string().optional(),
  birthDate: z.string().optional(),
  paymentType: z.enum(['salary', 'hourly', 'piecework']).optional().default('salary'),
  salary: z.coerce.number().min(0).optional().default(0),
  rate: z.coerce.number().min(0).optional().default(1),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormValues>;
  onClose: () => void;
  onSubmit: (data: EmployeeFormValues) => void;
}

export default function EmployeeForm({ initialData, onClose, onSubmit }: EmployeeFormProps) {
  const { t } = useTranslation();

  const localizedSchema = z.object({
    fullName: z.string().min(2, t('employees.form.validation.nameMin')),
    position: z.string().min(2, t('employees.form.validation.positionReq')),
    department: z.string().min(2, t('employees.form.validation.departmentReq')),
    status: z.enum(['active', 'on_leave', 'probation', 'dismissed']),
    hireDate: z.string().min(1, t('employees.form.validation.hireDateReq')),
    tabNumber: z.string().optional(),
    birthDate: z.string().optional(),
    paymentType: z.enum(['salary', 'hourly', 'piecework']).optional().default('salary'),
    salary: z.coerce.number().min(0).optional().default(0),
    rate: z.coerce.number().min(0).optional().default(1),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeFormValues>({
    resolver: zodResolver(localizedSchema) as any,
    defaultValues: initialData || {
      paymentType: 'salary',
      salary: 0,
      rate: 1,
      status: 'active',
    }
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface backdrop-blur-sm transition-opacity"
        {...clickable(onClose, t('common.close'))}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[var(--sidebar-bg)] border-l border-[var(--border-color)] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold tracking-tight">{initialData ? t('employees.form.editTitle') : t('employees.form.newTitle')}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 text-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t('employees.col.fullName')}</label>
            <input
              {...register('fullName')}
              className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder={t('employees.form.ph.fullName')}
            />
            {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('employees.col.position')}</label>
            <input
              {...register('position')}
              className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder={t('employees.form.ph.position')}
            />
            {errors.position && <p className="text-rose-500 text-xs mt-1">{errors.position.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('employees.form.department')}</label>
            <input
              {...register('department')}
              className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder={t('employees.form.ph.department')}
            />
            {errors.department && <p className="text-rose-500 text-xs mt-1">{errors.department.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('employees.col.tabNumber')}</label>
            <input
              {...register('tabNumber')}
              className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('employees.col.status')}</label>
              <select
                {...register('status')}
                className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="active">{t('employees.status.active')}</option>
                <option value="probation">{t('employees.status.probation')}</option>
                <option value="on_leave">{t('employees.status.onLeave')}</option>
                <option value="dismissed">{t('employees.status.dismissed')}</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employees.form.hireDate')}</label>
                <input 
                  type="date"
                  {...register('hireDate')}
                  className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                {errors.hireDate && <p className="text-rose-500 text-xs mt-1">{errors.hireDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('employees.form.birthDate')}</label>
                <input 
                  type="date"
                  {...register('birthDate')}
                  className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 mt-4">
              <h3 className="text-sm font-semibold text-primary dark:text-primary border-b border-[var(--border-color)] pb-2">{t('employees.form.payTitle')}</h3>

              <div>
                <label className="block text-sm font-medium mb-2">{t('employees.form.payType')}</label>
                <select
                  {...register('paymentType')}
                  className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="salary">{t('employees.form.pay.salary')}</option>
                  <option value="hourly">{t('employees.form.pay.hourly')}</option>
                  <option value="piecework">{t('employees.form.pay.piecework')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employees.form.salary')}</label>
                  <input 
                    type="number"
                    step="0.01"
                    {...register('salary')}
                    className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employees.col.rate')}</label>
                  <select
                    {...register('rate')}
                    className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="1">100%</option>
                    <option value="0.75">75% (0.75)</option>
                    <option value="0.5">50% (0.5)</option>
                    <option value="0.25">25% (0.25)</option>
                  </select>
                              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-[var(--border-color)] flex gap-3 bg-surface-2 dark:bg-slate-900/50">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-xl font-medium hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSubmit(onSubmit)}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
