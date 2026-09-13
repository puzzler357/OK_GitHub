import React, { useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Upload } from 'lucide-react';
import EmployeeForm from '../components/EmployeeForm';
import EmployeeActions from '../components/EmployeeActions';
import { exportToExcel, parseExcel } from '../lib/excel';
import { useMoney } from '../lib/money';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { Employee } from '../store/useDatabaseStore';

const columnHelper = createColumnHelper<Employee>();

type RateFilter = 'all' | 'full' | 'partial' | 'extended';

// Ставка сравнивается по диапазону, а не по равенству: строгое совпадение
// с 0.5 или 0.25 отсекало бы всё остальное неполное.
const rateFilterFn: FilterFn<Employee> = (row, columnId, value) => {
  if (value === 'all') return true;
  const rate = (row.getValue(columnId) as number | undefined) ?? 1;
  if (value === 'full') return rate === 1;
  if (value === 'partial') return rate < 1;
  if (value === 'extended') return rate > 1;
  return true;
};

export default function Employees() {
  const { t } = useTranslation();
  const { employees: data, departments, addEmployee, importEmployees } = useDatabaseStore();
  const money = useMoney();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rateFilter, setRateFilter] = useState<RateFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Опции берём из справочника подразделений, а не из строк сотрудников:
  // иначе пустое подразделение в списке не появится.
  const departmentOptions = useMemo(() => {
    const fromCatalog = departments.map((d) => d.name);
    const fromEmployees = data.map((e) => e.department);
    return Array.from(new Set([...fromCatalog, ...fromEmployees])).filter(Boolean).sort();
  }, [departments, data]);

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = [];
    if (departmentFilter !== 'all') filters.push({ id: 'department', value: departmentFilter });
    if (statusFilter !== 'all') filters.push({ id: 'status', value: statusFilter });
    if (rateFilter !== 'all') filters.push({ id: 'rate', value: rateFilter });
    return filters;
  }, [departmentFilter, statusFilter, rateFilter]);

  const resetFilters = () => {
    setGlobalFilter('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setRateFilter('all');
  };

  const filtersActive =
    globalFilter !== '' || departmentFilter !== 'all' || statusFilter !== 'all' || rateFilter !== 'all';

  const handleAddEmployee = (newEmployee: any) => {
    addEmployee(newEmployee);
    setIsFormOpen(false);
  };

  const handleExport = async () => {
    await exportToExcel(data, 'Employees');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let rows: Omit<Employee, 'id'>[];
    try {
      const parsedData = await parseExcel(file);
      rows = parsedData.map((row: any) => ({
        fullName: row['ФИО'] || row['fullName'] || 'Unknown',
        position: row['Должность'] || row['position'] || 'Unknown',
        department: row['Подразделение'] || row['department'] || 'Unknown',
        status: (row['Статус'] || row['status'] || 'active') as Employee['status'],
        hireDate: row['Дата приема'] || row['hireDate'] || new Date().toISOString().split('T')[0],
        tabNumber: row['Таб. номер'] || row['tabNumber'] || undefined,
      }));
    } catch (err) {
      console.error('Failed to parse excel:', err);
      alert(t('employees.readError'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      // Пишем в БД, а не только в стор: иначе импортированные строки
      // исчезали при первом же обновлении списка.
      const created = await importEmployees(rows);
      alert(t('employees.importDone', { n: created }));
    } catch (err) {
      console.error('Failed to import employees:', err);
      alert(t('employees.importFailed'));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('fullName', {
      header: t('employees.col.fullName'),
      cell: info => <span className="font-medium text-primary dark:text-slate-100">{info.getValue()}</span>,
    }),
    columnHelper.accessor('tabNumber', {
      header: t('employees.col.tabNumber'),
      cell: info => <span className="text-muted tabular-nums">{info.getValue() || '—'}</span>,
    }),

    columnHelper.accessor('salary', {
      header: t('employees.col.salary'),
      cell: info => {
        const val = info.getValue();
        if (val == null) return <span className="text-muted">—</span>;
        return <span className="tabular-nums">{money.format(val)}</span>;
      },
    }),
    columnHelper.accessor('rate', {
      header: t('employees.col.rate'),
      filterFn: rateFilterFn,
      cell: info => {
        const val = info.getValue() || 1;
        return <span>{val * 100}%</span>;
      },
    }),
    columnHelper.accessor('department', {
      header: t('employees.col.department'),
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('position', {
      header: t('employees.col.position'),
      cell: info => info.getValue(),
    }),

    columnHelper.accessor('status', {
      header: t('employees.col.status'),
      cell: info => {
        const val = info.getValue();
        if (val === 'active') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{t('employees.status.active')}</span>;
        if (val === 'on_leave') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{t('employees.status.onLeave')}</span>;
        if (val === 'probation') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400">{t('employees.status.probation')}</span>;
        return val;
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => (
        <EmployeeActions employee={info.row.original} />
      ),
    })
  ], [t, money]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const shownCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('employees.title')}{' '}
          <span className="text-muted text-lg font-normal">
            ({filtersActive ? `${shownCount} / ${data.length}` : data.length})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-surface-3 border border-line hover:bg-surface-hover text-secondary px-4 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <Upload className="w-4 h-4" />
            {t('common.import')}
          </button>
          <button
            onClick={handleExport}
            className="bg-surface-3 border border-line hover:bg-surface-hover text-secondary px-4 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            {t('common.export')}
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            {t('employees.add')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-4 bg-surface-2 dark:bg-slate-900/50">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder={t('common.search')}
                className="w-full px-4 py-2 bg-surface border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 transition-shadow"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="bg-surface border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-secondary w-40"
            >
              <option value="all">{t('employees.allDepartments')}</option>
              {departmentOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-secondary w-40"
            >
              <option value="all">{t('employees.allStatuses')}</option>
              <option value="active">{t('employees.status.active')}</option>
              <option value="on_leave">{t('employees.status.onLeave')}</option>
              <option value="probation">{t('employees.status.probation')}</option>
            </select>
            <select
              value={rateFilter}
              onChange={e => setRateFilter(e.target.value as RateFilter)}
              className="bg-surface border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-secondary w-40"
            >
              <option value="all">{t('employees.anyRate')}</option>
              <option value="full">{t('employees.rateFull')}</option>
              <option value="partial">{t('employees.ratePartial')}</option>
              <option value="extended">{t('employees.rateExtended')}</option>
            </select>
            <button
              onClick={resetFilters}
              disabled={!filtersActive}
              className="bg-surface-4 hover:bg-surface-hover text-secondary px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.reset')}
            </button>
          </div>
          <div className="flex items-center bg-surface border border-line rounded-xl overflow-hidden flex-shrink-0">
            <button className="p-2 hover:bg-surface-hover transition-colors bg-surface-3 text-primary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button className="p-2 hover:bg-surface-hover transition-colors text-muted">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-surface-2 dark:bg-slate-900/50 border-b border-[var(--border-color)]">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="p-table text-table font-medium cursor-pointer hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ChevronUp className="w-4 h-4" />,
                          desc: <ChevronDown className="w-4 h-4" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="bg-white dark:bg-slate-950 border-b border-[var(--border-color)] hover:bg-surface-hover dark:hover:bg-slate-900 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-table text-table">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {table.getRowModel().rows.length === 0 && (
            <div className="p-12 text-center text-muted">
              {t('employees.empty')}
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <EmployeeForm
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleAddEmployee}
        />
      )}
    </div>
  );
}
