import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';

export default function Movements() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{t('nav.movements')}</h2>
        <div className="flex items-center gap-3">
          <button className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {t('movements.hire')}
          </button>
          <button className="bg-accent-600/20 text-accent-400 border border-accent-500/30 hover:bg-accent-600/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {t('movements.transfer')}
          </button>
          <button className="bg-rose-600/20 text-rose-500 border border-rose-500/30 hover:bg-rose-600/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {t('movements.dismissal')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-4 bg-surface-2 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <select className="bg-white dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
              <option>{t('movements.allTypes')}</option>
              <option>{t('movements.hire')}</option>
              <option>{t('movements.transfer')}</option>
              <option>{t('movements.dismissal')}</option>
            </select>
            <input
              type="date"
              className="bg-white dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder={t('movements.datePh')}
            />
            <input
              type="date"
              className="bg-white dark:bg-slate-950 border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              placeholder={t('movements.datePh')}
            />
          </div>
          <button className="bg-surface-3 dark:bg-slate-800 border border-[var(--border-color)] hover:bg-surface-hover dark:hover:bg-slate-700 text-secondary dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {t('common.export')}
          </button>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-surface-2 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
              <tr>
                <th className="p-table text-table font-medium">{t('movements.startDate')}</th>
                <th className="p-table text-table font-medium">{t('employees.col.fullName')}</th>
                <th className="p-table text-table font-medium">{t('employees.col.status')}</th>
                <th className="p-table text-table font-medium">{t('employees.col.position')}</th>
                <th className="p-table text-table font-medium">{t('movements.reason')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-table text-table text-center text-muted">
                  {t('common.loading')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
