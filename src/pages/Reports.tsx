import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingDown, ClipboardList, BarChart as BarChartIcon, Download, Save } from 'lucide-react';
import { exportToExcel } from '../lib/excel';
import { useMoney } from '../lib/money';
import { positionStats } from '../lib/staffing';
import { timesheetTotals } from '../lib/timesheet';
import { useDatabaseStore, TABLES } from '../store/useDatabaseStore';
import type { ReportPreset } from '../store/useDatabaseStore';

/**
 * Таблица отчёта. И экран, и выгрузка строятся из одного результата, поэтому
 * в файле оказывается ровно то, что человек видел на экране, — раньше кнопка
 * выгрузки не была подключена вовсе.
 */
interface ReportTable {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}

type SourceId = 'employees' | 'positions' | 'timesheets' | 'archives' | 'movements' | 'candidates';

export default function Reports() {
  const { t } = useTranslation();
  const money = useMoney();

  const [activeTab, setActiveTab] = useState('catalog');
  const [selectedReport, setSelectedReport] = useState<number | null>(null);

  const {
    employees, positions, departments, timesheets, archives, movements, candidates,
    reportPresets, fetchTimesheets, fetchArchives, createIn,
  } = useDatabaseStore();

  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() });

  // Табель и архив грузятся срезом и в общий fetchAll не входят — экран
  // отчётов запрашивает их сам.
  useEffect(() => {
    fetchTimesheets(period.year, period.month);
  }, [fetchTimesheets, period.year, period.month]);

  useEffect(() => {
    fetchArchives({ year: period.year });
  }, [fetchArchives, period.year]);

  const employeeName = (id: string) => employees.find(e => e.id === id)?.fullName ?? '—';

  const statusLabel = (status: string) =>
    status === 'active' ? t('employees.status.active')
      : status === 'probation' ? t('employees.status.probation')
        : status === 'dismissed' ? t('employees.status.dismissed')
          : t('employees.status.onLeave');

  const reports = [
    { id: 1, icon: Users, title: t('reports.items.headcountTitle'), desc: t('reports.items.headcountDesc') },
    { id: 2, icon: TrendingDown, title: t('reports.items.turnoverTitle'), desc: t('reports.items.turnoverDesc') },
    { id: 3, icon: ClipboardList, title: t('reports.items.timesheetTitle'), desc: t('reports.items.timesheetDesc') },
    { id: 4, icon: BarChartIcon, title: t('reports.items.movementsTitle'), desc: t('reports.items.movementsDesc') },
    { id: 5, icon: Users, title: t('reports.items.staffingTitle'), desc: t('reports.items.staffingDesc') },
  ];

  const monthNames = t('timesheet.months', { returnObjects: true }) as string[];

  const reportTable = useMemo<ReportTable | null>(() => {
    if (!selectedReport) return null;

    // 1. Списочная численность.
    if (selectedReport === 1) {
      return {
        columns: [
          { key: 'fullName', label: t('employees.col.fullName') },
          { key: 'position', label: t('employees.col.position') },
          { key: 'department', label: t('employees.col.department') },
          { key: 'hireDate', label: t('employees.form.hireDate') },
          { key: 'status', label: t('employees.col.status') },
        ],
        rows: employees.map(e => ({
          fullName: e.fullName,
          position: e.position,
          department: e.department,
          hireDate: e.hireDate,
          status: statusLabel(e.status),
        })),
      };
    }

    // 2. Текучесть — считается по кадровым операциям, а не по константам
    // «4.2%» и «12», которые стояли здесь раньше.
    if (selectedReport === 2) {
      const rows = monthNames.map((name, index) => {
        const inMonth = movements.filter(m => {
          const date = new Date(m.date);
          return date.getFullYear() === period.year && date.getMonth() === index;
        });
        const hired = inMonth.filter(m => m.type === 'hire').length;
        const dismissed = inMonth.filter(m => m.type === 'dismissal').length;
        const headcount = employees.length || 1;
        return {
          month: name,
          hired,
          dismissed,
          turnover: `${((dismissed / headcount) * 100).toFixed(1)}%`,
        };
      });

      return {
        columns: [
          { key: 'month', label: t('reports.month') },
          { key: 'hired', label: t('reports.hired') },
          { key: 'dismissed', label: t('reports.dismissed') },
          { key: 'turnover', label: t('reports.items.turnoverTitle') },
        ],
        rows,
      };
    }

    // 3. Табель за выбранный месяц — по реальным записям, а не по
    // пятнадцати выдуманным дням.
    if (selectedReport === 3) {
      const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();

      return {
        columns: [
          { key: 'fullName', label: t('timeoff.colEmployee') },
          { key: 'worked', label: t('timesheet.colWorked') },
          { key: 'absent', label: t('reports.total') },
        ],
        rows: employees.map(emp => {
          const record = timesheets.find(ts => ts.employeeId === emp.id);
          // Тот же расчёт, что на экране табеля: отчёт не должен показывать
          // другие цифры по тем же данным.
          const totals = timesheetTotals(record?.days ?? {}, period.year, period.month);
          return {
            fullName: emp.fullName,
            worked: totals.workDays,
            absent: daysInMonth - totals.workDays,
          };
        }),
      };
    }

    // 4. Кадровые движения — из таблицы movements.
    if (selectedReport === 4) {
      return {
        columns: [
          { key: 'date', label: t('movements.date') },
          { key: 'type', label: t('movements.type') },
          { key: 'employee', label: t('movements.employee') },
          { key: 'from', label: t('movements.was') },
          { key: 'to', label: t('movements.became') },
          { key: 'orderNo', label: t('movements.orderNo') },
        ],
        rows: movements.map(m => ({
          date: m.date,
          type: m.type === 'hire' ? t('movements.hire') : m.type === 'transfer' ? t('movements.transfer') : t('movements.dismissal'),
          employee: employeeName(m.employeeId),
          from: m.fromPosition ?? '—',
          to: m.toPosition ?? '—',
          orderNo: m.orderNo ?? '—',
        })),
      };
    }

    // 5. Штатная расстановка — оклад берётся из штатного расписания, раньше
    // в этой колонке стояла подпись-заглушка.
    return {
      columns: [
        { key: 'department', label: t('employees.col.department') },
        { key: 'position', label: t('employees.col.position') },
        { key: 'total', label: t('orgchart.staffUnits') },
        { key: 'occupied', label: t('orgchart.occupied') },
        { key: 'vacant', label: t('orgchart.vacant') },
        { key: 'salary', label: t('employees.col.salary') },
      ],
      // Занятость считается тем же кодом, что и в оргструктуре.
      rows: positionStats(positions, employees, departments).map(stat => ({
        department: stat.department,
        position: stat.title,
        total: stat.total,
        occupied: stat.occupied,
        vacant: stat.vacant,
        salary: money.format(stat.salary),
      })),
    };
  }, [selectedReport, employees, positions, departments, timesheets, movements, period, monthNames, money, t]);

  const handleExportReport = async () => {
    if (!reportTable) return;
    const rows = reportTable.rows.map(row => {
      const out: Record<string, string | number> = {};
      for (const col of reportTable.columns) out[col.label] = row[col.key];
      return out;
    });
    await exportToExcel(rows, `Report-${selectedReport}`);
  };

  // ---- Конструктор ----

  // Конструктор работает с произвольными сущностями, поэтому строки здесь
  // намеренно обезличены до записей: колонки выбирает пользователь.
  const sources: { id: SourceId; label: string; rows: Record<string, unknown>[] }[] = [
    { id: 'employees', label: t('reports.srcEmployees'), rows: employees as unknown as Record<string, unknown>[] },
    { id: 'positions', label: t('reports.srcPositions'), rows: positions as unknown as Record<string, unknown>[] },
    { id: 'timesheets', label: t('reports.srcTimesheets'), rows: timesheets as unknown as Record<string, unknown>[] },
    { id: 'archives', label: t('reports.srcArchives'), rows: archives as unknown as Record<string, unknown>[] },
    { id: 'movements', label: t('reports.srcMovements'), rows: movements as unknown as Record<string, unknown>[] },
    { id: 'candidates', label: t('reports.srcCandidates'), rows: candidates as unknown as Record<string, unknown>[] },
  ];

  const [source, setSource] = useState<SourceId>('employees');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [presetName, setPresetName] = useState('');

  const sourceRows = sources.find(s => s.id === source)?.rows ?? [];

  const availableFields = useMemo(() => {
    const keys = new Set<string>();
    for (const row of sourceRows.slice(0, 50)) {
      Object.keys(row).forEach(k => keys.add(k));
    }
    return Array.from(keys);
  }, [sourceRows]);

  // Выбор полей выводится, а не сбрасывается эффектом: при смене источника
  // колонок из прежнего набора в нём просто не остаётся, а пустой выбор
  // заполняется первыми пятью полями нового источника.
  const activeFields = useMemo(() => {
    const kept = selectedFields.filter(field => availableFields.includes(field));
    return kept.length > 0 ? kept : availableFields.slice(0, 5);
  }, [selectedFields, availableFields]);

  const activeFilterField = availableFields.includes(filterField) ? filterField : '';
  const activeGroupBy = activeFields.includes(groupBy) ? groupBy : '';

  const builderRows = useMemo(() => {
    let rows = sourceRows;

    if (filterValue) {
      const needle = filterValue.toLowerCase();
      rows = rows.filter(row => {
        const fields = activeFilterField ? [activeFilterField] : Object.keys(row);
        return fields.some(f => String(row[f] ?? '').toLowerCase().includes(needle));
      });
    }

    const projected = rows.map(row => {
      const out: Record<string, string | number> = {};
      for (const field of activeFields) {
        const value = row[field];
        out[field] = typeof value === 'object' && value !== null ? JSON.stringify(value) : (value as any) ?? '';
      }
      return out;
    });

    if (!activeGroupBy) return projected;
    // Группировка — сортировка по ключу: строки одной группы идут подряд,
    // а сам ключ остаётся колонкой, поэтому выгрузка не теряет структуру.
    return projected.slice().sort((a, b) => String(a[activeGroupBy]).localeCompare(String(b[activeGroupBy])));
  }, [sourceRows, activeFilterField, filterValue, activeFields, activeGroupBy]);

  const toggleField = (field: string) => {
    setSelectedFields(prev => (prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]));
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    await createIn<ReportPreset>(TABLES.reportPresets, {
      name: presetName.trim(),
      config: JSON.stringify({ source, selectedFields: activeFields, filterField: activeFilterField, filterValue, groupBy: activeGroupBy }),
    });
    setPresetName('');
  };

  const applyPreset = (preset: ReportPreset) => {
    try {
      const config = JSON.parse(preset.config);
      // Порядок больше не важен: выбор полей выводится, а не восстанавливается
      // эффектом, поэтому setTimeout здесь не нужен.
      setSource(config.source ?? 'employees');
      setSelectedFields(config.selectedFields ?? []);
      setFilterField(config.filterField ?? '');
      setFilterValue(config.filterValue ?? '');
      setGroupBy(config.groupBy ?? '');
    } catch {
      // Набор с испорченным JSON просто не применяем.
    }
  };

  const handleBuilderExcel = async () => {
    if (builderRows.length === 0) return;
    await exportToExcel(builderRows, `Report-${source}`);
  };

  const handleBuilderJson = () => {
    const blob = new Blob([JSON.stringify(builderRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${source}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const control = 'w-full bg-app border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary';

  const renderReportContent = () => {
    if (!selectedReport || !reportTable) {
      return (
        <div className="flex-1 rounded-2xl border border-dashed border-line bg-surface-2 flex items-center justify-center">
          <p className="text-muted text-sm">{t('reports.selectReport')}</p>
        </div>
      );
    }

    const report = reports.find(r => r.id === selectedReport);

    return (
      <div className="flex-1 rounded-2xl border border-line bg-surface flex flex-col overflow-hidden">
        <div className="p-6 border-b border-line flex flex-wrap justify-between items-center gap-4 bg-surface-2">
          <div>
            <h3 className="font-semibold text-lg text-primary">{report?.title}</h3>
            <p className="text-sm text-muted">{report?.desc}</p>
          </div>
          <div className="flex items-center gap-3">
            {(selectedReport === 2 || selectedReport === 3) && (
              <>
                {selectedReport === 3 && (
                  <select
                    value={period.month}
                    onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}
                    className="bg-app border border-line rounded-xl px-3 py-2 text-sm text-primary"
                  >
                    {monthNames.map((name, i) => <option key={name} value={i}>{name}</option>)}
                  </select>
                )}
                <input
                  type="number"
                  value={period.year}
                  onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
                  className="w-24 bg-app border border-line rounded-xl px-3 py-2 text-sm text-primary"
                />
              </>
            )}
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 bg-surface-3 hover:bg-surface-hover border border-strong px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> {t('reports.downloadExcel')}
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-surface-3">
              <tr>
                {reportTable.columns.map((col, i) => (
                  <th
                    key={col.key}
                    className={`p-table text-table ${i === 0 ? 'rounded-tl-xl' : ''} ${i === reportTable.columns.length - 1 ? 'rounded-tr-xl' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportTable.rows.map((row, i) => (
                <tr key={i} className="border-b border-line hover:bg-surface-hover">
                  {reportTable.columns.map((col, j) => (
                    <td key={col.key} className={`p-table text-table ${j === 0 ? 'font-medium text-primary' : 'text-muted'}`}>
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {reportTable.rows.length === 0 && (
                <tr>
                  <td colSpan={reportTable.columns.length} className="p-table text-table text-center text-muted py-8">
                    {t('reports.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBuilder = () => (
    <div className="flex-1 rounded-2xl border border-line bg-surface flex flex-col overflow-hidden">
      <div className="p-6 border-b border-line bg-surface-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-2">{t('reports.source')}</label>
            <select value={source} onChange={(e) => setSource(e.target.value as SourceId)} className={control}>
              {sources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-2">{t('reports.filterField')}</label>
            <select value={activeFilterField} onChange={(e) => setFilterField(e.target.value)} className={control}>
              <option value="">{t('reports.anyField')}</option>
              {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-2">{t('reports.filterValue')}</label>
            <input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={control} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-2">{t('reports.fields')}</label>
          <div className="flex flex-wrap gap-2">
            {availableFields.map(field => (
              <button
                key={field}
                onClick={() => toggleField(field)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeFields.includes(field) ? 'bg-accent-500/20 text-accent-400 border-accent-500/40' : 'bg-surface-3 text-muted border-line hover:bg-surface-hover'}`}
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted mb-2">{t('reports.groupBy')}</label>
            <select value={activeGroupBy} onChange={(e) => setGroupBy(e.target.value)} className={control}>
              <option value="">{t('reports.noGrouping')}</option>
              {activeFields.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-2">{t('reports.presetName')}</label>
            <input value={presetName} onChange={(e) => setPresetName(e.target.value)} className={control} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="flex items-center gap-2 bg-surface-3 hover:bg-surface-hover border border-line disabled:opacity-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" /> {t('reports.savePreset')}
            </button>
            <button
              onClick={handleBuilderExcel}
              disabled={builderRows.length === 0}
              className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={handleBuilderJson}
              disabled={builderRows.length === 0}
              className="bg-surface-3 hover:bg-surface-hover border border-line disabled:opacity-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {t('reports.exportJson')}
            </button>
          </div>
        </div>

        {reportPresets.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted mb-2">{t('reports.presets')}</label>
            <div className="flex flex-wrap gap-2">
              {reportPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-3 text-secondary border border-line hover:bg-surface-hover transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 overflow-auto custom-scrollbar flex-1">
        <p className="text-xs text-muted mb-3">{t('reports.rowsFound', { n: builderRows.length })}</p>

        {activeFields.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">{t('reports.selectFields')}</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-surface-3">
              <tr>
                {activeFields.map(field => (
                  <th key={field} className="p-table text-table">{field}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {builderRows.slice(0, 200).map((row, i) => (
                <tr key={i} className="border-b border-line hover:bg-surface-hover">
                  {activeFields.map(field => (
                    <td key={field} className="p-table text-table text-muted">{row[field]}</td>
                  ))}
                </tr>
              ))}
              {builderRows.length === 0 && (
                <tr>
                  <td colSpan={activeFields.length} className="p-table text-table text-center text-muted py-8">
                    {t('reports.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <h2 className="text-2xl font-semibold tracking-tight">{t('nav.reports')}</h2>

      <div className="flex gap-1">
        <button
          onClick={() => { setActiveTab('catalog'); setSelectedReport(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'catalog' ? 'bg-surface-3 text-primary' : 'text-muted hover:bg-surface-hover'}`}
        >
          {t('reports.catalog')}
        </button>
        <button
          onClick={() => setActiveTab('constructor')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'constructor' ? 'bg-surface-3 text-primary' : 'text-muted hover:bg-surface-hover'}`}
        >
          {t('reports.constructorBeta')}
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {activeTab === 'catalog' && (
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="font-semibold text-lg mb-2">{t('reports.catalog')}</h3>
            {reports.map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors text-left group ${selectedReport === report.id ? 'bg-surface-3 border-accent-500' : 'bg-surface-3 border-line hover:bg-surface-hover'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-surface-4 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-600/20 transition-colors">
                  <report.icon className="w-6 h-6 text-muted group-hover:text-accent-400" />
                </div>
                <div>
                  <h4 className="font-medium text-primary">{report.title}</h4>
                  <p className="text-sm text-muted mt-1">{report.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'catalog' ? renderReportContent() : renderBuilder()}
      </div>
    </div>
  );
}
