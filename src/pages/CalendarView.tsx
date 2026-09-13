import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView() {
  const { t } = useTranslation();
  const days = t('calendar.weekdays', { returnObjects: true }) as string[];
  const months = t('timesheet.months', { returnObjects: true }) as string[];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{t('nav.calendar')}</h2>
        <div className="flex items-center bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <button className="p-2 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted" />
          </button>
          <span className="px-6 font-medium text-sm">{months[6]} 2026</span>
          <button className="p-2 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="w-5 h-5 text-muted" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-surface-2 dark:bg-slate-900/50">
            {days.map(day => (
              <div key={day} className="py-3 text-center text-xs font-medium text-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-[var(--border-color)] gap-[1px]">
            {/* Empty cells for padding if needed, assuming July 2026 starts on Wed */}
            <div className="bg-[var(--sidebar-bg)]"></div>
            <div className="bg-[var(--sidebar-bg)]"></div>
            {dates.map((date, index) => (
              <div 
                key={date} 
                className={`bg-[var(--sidebar-bg)] p-3 min-h-[100px] transition-colors hover:bg-surface-hover dark:hover:bg-slate-900/50 ${date === 7 ? 'bg-accent-900/20' : ''}`}
              >
                <span className={`text-sm font-medium ${date === 7 ? 'text-accent-400' : 'text-secondary'}`}>{date}</span>
              </div>
            ))}
            {/* Fill remaining */}
            <div className="bg-[var(--sidebar-bg)]"></div>
            <div className="bg-[var(--sidebar-bg)]"></div>
            <div className="bg-[var(--sidebar-bg)]"></div>
            <div className="bg-[var(--sidebar-bg)]"></div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6 flex flex-col">
          <h3 className="font-semibold text-lg border-b border-[var(--border-color)] pb-4 mb-4">{t('calendar.upcoming')}</h3>
          <div className="flex-1 flex items-center justify-center text-muted text-sm">
            {t('common.loading')}
          </div>
        </div>
      </div>
    </div>
  );
}
