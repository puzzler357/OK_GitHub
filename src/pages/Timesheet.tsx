import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { exportToExcel } from '../lib/excel';
import { useTranslation } from 'react-i18next';
import { Clock, Calendar as CalendarIcon, Save, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useDatabaseStore } from '../store/useDatabaseStore';

// Коды формы Т-13 (буквенные обозначения — доменный стандарт, не переводятся).
// Подписи для легенды берутся из i18n (timesheet.codes.*).
const ATTENDANCE_CODES = {
  'Я': { hours: 8, color: 'text-primary' },
  'В': { hours: 0, color: 'text-rose-400 bg-rose-500/10' },
  'ОТ': { hours: 0, color: 'text-blue-400 bg-blue-500/10' },
  'Б': { hours: 0, color: 'text-amber-400 bg-amber-500/10' },
  'К': { hours: 8, color: 'text-emerald-400 bg-emerald-500/10' },
  'ОГ': { hours: 0, color: 'text-teal-400 bg-teal-500/10' },
  'ВМ': { hours: 11, color: 'text-orange-400 bg-orange-500/10' },
  'МВ': { hours: 0, color: 'text-indigo-400 bg-indigo-500/10' },
  'НН': { hours: 0, color: 'text-purple-400 bg-purple-500/10' },
  'ПР': { hours: 0, color: 'text-rose-500 bg-rose-500/20' },
};

export default function Timesheet() {
  const { t } = useTranslation();
  const { employees, timesheets, addTimesheet, updateTimesheet, fetchTimesheets } = useDatabaseStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const availableDepartments = useMemo(() => Array.from(new Set(employees.map(e => e.department))).sort(), [employees]);
  const filteredEmployees = useMemo(() => employees.filter(e => selectedDepartment === 'all' || e.department === selectedDepartment), [employees, selectedDepartment]);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Табель грузится помесячно: вся таблица на 10 000 сотрудников — это годы
  // записей, из которых на экране нужен ровно один месяц.
  useEffect(() => {
    fetchTimesheets(year, month);
  }, [fetchTimesheets, year, month]);

  // Load records for current month
  const [localDays, setLocalDays] = useState<Record<string, Record<number, string>>>({});
  
  useEffect(() => {
    const newLocalDays: Record<string, Record<number, string>> = {};
    employees.forEach(emp => {
      const record = timesheets.find(t => t.year === year && t.month === month && t.employeeId === emp.id);
      if (record) {
        newLocalDays[emp.id] = { ...record.days };
      } else {
        newLocalDays[emp.id] = {};
      }
    });
    setLocalDays(newLocalDays);
  }, [year, month, employees, timesheets]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Выгрузка: дни месяца по колонкам, итоги справа — тот же расчёт, что и
  // на экране. Кнопка «Скачать» раньше не была подключена вовсе.
  const handleDownload = async () => {
    const monthNamesForFile = t('timesheet.months', { returnObjects: true }) as string[];

    const rows = filteredEmployees.map(emp => {
      const days = localDays[emp.id] || {};
      const row: Record<string, string | number> = {
        [t('timeoff.colEmployee')]: emp.fullName,
        [t('employees.col.position')]: emp.position,
      };

      let workDays = 0;
      let hours = 0;
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const code = days[day] !== undefined ? days[day] : (isWeekend ? 'В' : 'Я');
        row[String(day)] = code;
        if (code === 'Я' || code === 'К' || code === 'ВМ') {
          workDays += 1;
          hours += ATTENDANCE_CODES[code as keyof typeof ATTENDANCE_CODES]?.hours || 0;
        }
      }

      row[t('timesheet.colWorked')] = workDays;
      row[t('timesheet.colHours')] = hours;
      return row;
    });

    await exportToExcel(rows, `Timesheet-${year}-${monthNamesForFile[month]}`);
  };

  // Самый тяжёлый экран приложения: 10 000 сотрудников на 31 колонку дней —
  // это больше 300 000 узлов DOM. Виртуализируем строки; закреплённые слева
  // и справа колонки при этом остаются на месте, потому что распорки —
  // обычные <tr>, а не обёртки вокруг таблицы.
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredEmployees.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 57,
    overscan: 10,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSave = () => {
    employees.forEach(emp => {
      const record = timesheets.find(t => t.year === year && t.month === month && t.employeeId === emp.id);
      const days = localDays[emp.id] || {};
      
      if (record) {
        updateTimesheet(record.id, { days });
      } else {
        addTimesheet({ year, month, employeeId: emp.id, days });
      }
    });
    alert(t('timesheet.saved'));
  };

  const toggleDayStatus = (empId: string, day: number) => {
    const currentCode = localDays[empId]?.[day];
    
    // Determine default based on weekend
    const date = new Date(year, month, day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    let nextCode = 'Я';
    if (!currentCode) {
      nextCode = isWeekend ? 'В' : 'Я';
    } else if (currentCode === 'Я') {
      nextCode = 'В';
    } else if (currentCode === 'В') {
      nextCode = 'ОТ';
    } else if (currentCode === 'ОТ') {
      nextCode = 'Б';
    } else if (currentCode === 'Б') {
      nextCode = 'К';
    } else if (currentCode === 'К') {
      nextCode = 'ОГ';
    } else if (currentCode === 'ОГ') {
      nextCode = 'ВМ';
    } else if (currentCode === 'ВМ') {
      nextCode = 'МВ';
    } else if (currentCode === 'МВ') {
      nextCode = 'НН';
    } else if (currentCode === 'НН') {
      nextCode = 'ПР';
    } else {
      nextCode = ''; // clear
    }
    
    setLocalDays(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [day]: nextCode
      }
    }));
  };

  const monthNames = t('timesheet.months', { returnObjects: true }) as string[];

  const codeLabels: Record<string, string> = {
    'Я': t('timesheet.codes.attendance'),
    'В': t('timesheet.codes.weekend'),
    'ОТ': t('timesheet.codes.vacation'),
    'Б': t('timesheet.codes.sick'),
    'К': t('timesheet.codes.trip'),
    'ОГ': t('timesheet.codes.dayoff'),
    'ВМ': t('timesheet.codes.shift'),
    'МВ': t('timesheet.codes.shiftRest'),
    'НН': t('timesheet.codes.absenceUnknown'),
    'ПР': t('timesheet.codes.truancy'),
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Clock className="w-6 h-6 text-accent-500" />
            {t('timesheet.title')}
          </h2>
          <p className="text-muted mt-1">{t('timesheet.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-surface-3 hover:bg-surface-hover text-secondary px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('timesheet.download')}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-surface border border-line p-4 rounded-2xl flex-shrink-0">
        <div className="flex items-center gap-4">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-surface-3 border border-line text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="all">{t('timesheet.allDepartments')}</option>
            {availableDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted" />
          </button>
          <div className="flex items-center gap-2 min-w-[140px] justify-center">
            <CalendarIcon className="w-5 h-5 text-accent-500" />
            <span className="font-semibold text-lg text-primary">
              {monthNames[month]} {year}
            </span>
          </div>
          <button onClick={handleNextMonth} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-muted" />
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-xs justify-end max-w-xl">
          {Object.entries(ATTENDANCE_CODES).map(([code, info]) => (
            <div key={code} className="flex items-center gap-1.5">
              <span className={`w-6 h-6 flex items-center justify-center rounded ${info.color} font-medium`}>
                {code}
              </span>
              <span className="text-muted">{codeLabels[code]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-surface-2 border border-line rounded-2xl flex flex-col">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted uppercase bg-surface-3 sticky top-0 z-20">
              <tr>
                <th className="p-table text-table border-b border-line sticky left-0 bg-surface-3 z-30 min-w-[200px]">{t('timeoff.colEmployee')}</th>
                {Array.from({length: daysInMonth}).map((_, i) => {
                  const date = new Date(year, month, i + 1);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <th key={i} className={`px-1 py-3 text-center border-b border-line border-l border-subtle min-w-[36px] ${isWeekend ? 'text-rose-400 bg-rose-500/5' : ''}`}>
                      {i + 1}
                    </th>
                  );
                })}
                <th className="px-3 py-3 border-b border-line border-l border-line text-center sticky right-[120px] bg-surface-3 z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                  {t('timesheet.colWorked')}
                </th>
                <th className="px-3 py-3 border-b border-line border-l border-line text-center sticky right-[60px] bg-surface-3 z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                  {t('timesheet.colAttendances')}
                </th>
                <th className="px-3 py-3 border-b border-line border-l border-line text-center sticky right-0 bg-surface-3 z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                  {t('timesheet.colHours')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paddingTop > 0 && <tr style={{ height: paddingTop }} aria-hidden />}
              {virtualRows.map(virtualRow => {
                const emp = filteredEmployees[virtualRow.index];
                const days = localDays[emp.id] || {};
                
                // Calculate summaries
                let totalWorkDays = 0;
                let totalHours = 0;
                let workedDaysStr = 0;
                
                for (let i = 1; i <= daysInMonth; i++) {
                  const date = new Date(year, month, i);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  const code = days[i] !== undefined ? days[i] : (isWeekend ? 'В' : 'Я');
                  if (code === 'Я' || code === 'К' || code === 'ВМ') {
                    totalWorkDays++;
                    totalHours += ATTENDANCE_CODES[code as keyof typeof ATTENDANCE_CODES]?.hours || 0;
                    if (code === 'Я' || code === 'ВМ') workedDaysStr++;
                  }
                }
                
                return (
                  <tr key={emp.id} className="border-b border-subtle hover:bg-surface-hover group">
                    <td className="px-4 py-2 font-medium text-primary sticky left-0 bg-surface group-hover:bg-surface-hover transition-colors z-10 border-r border-subtle">
                      <div className="truncate max-w-[180px]" title={emp.fullName}>{emp.fullName}</div>
                      <div className="text-xs text-muted font-normal truncate max-w-[180px]">{emp.position}</div>
                    </td>
                    {Array.from({length: daysInMonth}).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(year, month, day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const defaultCode = isWeekend ? 'В' : 'Я';
                      const code = days[day] !== undefined ? days[day] : defaultCode;
                      const info = ATTENDANCE_CODES[code as keyof typeof ATTENDANCE_CODES] || { color: 'text-muted' };
                      
                      return (
                        <td 
                          key={i} 
                          onClick={() => toggleDayStatus(emp.id, day)}
                          className={`px-1 py-2 text-center border-l border-subtle cursor-pointer hover:bg-surface-hover transition-colors ${info.color} ${isWeekend && !days[day] ? 'bg-rose-500/5' : ''}`}
                        >
                          {code}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center border-l border-line font-medium text-secondary sticky right-[120px] bg-surface group-hover:bg-surface-hover z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                      {totalWorkDays} {t('timeoff.daysUnit')}
                    </td>
                    <td className="px-3 py-2 text-center border-l border-line font-medium text-accent-400 sticky right-[60px] bg-surface group-hover:bg-surface-hover z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                      {workedDaysStr}
                    </td>
                    <td className="px-3 py-2 text-center border-l border-line font-bold text-accent-500 sticky right-0 bg-surface group-hover:bg-surface-hover z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.5)]">
                      {totalHours}
                    </td>
                  </tr>
                );
              })}
              {paddingBottom > 0 && <tr style={{ height: paddingBottom }} aria-hidden />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
