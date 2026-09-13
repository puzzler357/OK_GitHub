import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, AlertTriangle, Check } from 'lucide-react';
import { parseExcel } from '../lib/excel';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { Employee } from '../store/useDatabaseStore';

/** Поля карточки, на которые можно отобразить колонку файла. */
const TARGET_FIELDS = [
  'fullName', 'position', 'department', 'status', 'hireDate', 'tabNumber', 'birthDate', 'salary', 'rate',
] as const;

type TargetField = (typeof TARGET_FIELDS)[number];

const REQUIRED_FIELDS: TargetField[] = ['fullName', 'position', 'department', 'hireDate'];
const NUMERIC_FIELDS: TargetField[] = ['salary', 'rate'];
const STATUSES = ['active', 'on_leave', 'probation', 'dismissed'];

/** Подсказки для автосопоставления: заголовок файла -> поле карточки. */
const HEADER_HINTS: Record<TargetField, string[]> = {
  fullName: ['фио', 'имя', 'сотрудник', 'fullname', 'name'],
  position: ['должность', 'position', 'job'],
  department: ['подразделение', 'отдел', 'department'],
  status: ['статус', 'status'],
  hireDate: ['дата приема', 'дата приёма', 'приём', 'hiredate', 'hired'],
  tabNumber: ['таб', 'табельный', 'tabnumber', 'id number'],
  birthDate: ['рождения', 'birth'],
  salary: ['оклад', 'зарплата', 'salary'],
  rate: ['ставка', 'rate'],
};

function guessField(header: string): TargetField | '' {
  const normalized = header.toLowerCase().trim();
  for (const field of TARGET_FIELDS) {
    if (HEADER_HINTS[field].some(hint => normalized.includes(hint))) return field;
  }
  return '';
}

interface PreparedRow {
  index: number;
  values: Record<string, string>;
  problems: string[];
}

/**
 * Мастер импорта сотрудников.
 *
 * Раньше четыре шага были просто нарисованы. Здесь они настоящие: файл
 * разбирается, колонки сопоставляются с полями карточки, строки проверяются,
 * и в базу уходят только те, что прошли проверку, — одной транзакцией.
 */
export default function ImportWizard() {
  const { t } = useTranslation();
  const { importEmployees } = useDatabaseStore();

  const [step, setStep] = useState(1);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, TargetField | ''>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) {
        setError(t('settings.io.noRows'));
        return;
      }

      // Заголовки собираем по всем строкам: в разреженных файлах первая
      // строка может не содержать всех колонок.
      const found = Array.from(new Set(rows.flatMap(row => Object.keys(row as object))));
      setRawRows(rows);
      setHeaders(found);
      setMapping(Object.fromEntries(found.map(h => [h, guessField(h)])));
      setStep(2);
    } catch {
      setError(t('settings.io.parseError'));
    }
  };

  const prepared = useMemo<PreparedRow[]>(() => {
    const used = Object.entries(mapping).filter(([, field]) => field) as [string, TargetField][];

    return rawRows.map((row, index) => {
      const values: Record<string, string> = {};
      for (const [header, field] of used) {
        const value = (row as Record<string, unknown>)[header];
        values[field] = value === undefined || value === null ? '' : String(value).trim();
      }

      const problems: string[] = [];
      for (const field of REQUIRED_FIELDS) {
        if (!values[field]) problems.push(`${field}: ${t('settings.io.required')}`);
      }
      if (values.status && !STATUSES.includes(values.status)) {
        problems.push(`status: ${t('settings.io.badStatus')}`);
      }
      for (const field of NUMERIC_FIELDS) {
        if (values[field] && Number.isNaN(Number(values[field].replace(',', '.')))) {
          problems.push(`${field}: ${t('settings.io.badNumber')}`);
        }
      }

      return { index, values, problems };
    });
  }, [rawRows, mapping, t]);

  const validRows = prepared.filter(row => row.problems.length === 0);
  const invalidRows = prepared.filter(row => row.problems.length > 0);

  const handleImport = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = validRows.map(row => ({
        fullName: row.values.fullName,
        position: row.values.position,
        department: row.values.department,
        status: (row.values.status || 'active') as Employee['status'],
        hireDate: row.values.hireDate,
        tabNumber: row.values.tabNumber || undefined,
        birthDate: row.values.birthDate || undefined,
        salary: row.values.salary ? Number(row.values.salary.replace(',', '.')) : undefined,
        rate: row.values.rate ? Number(row.values.rate.replace(',', '.')) : undefined,
      }));

      const count = await importEmployees(payload);
      setImportedCount(count);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employees.importFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setImportedCount(null);
    setError('');
  };

  const stepTitles = [t('settings.io.step1'), t('settings.io.step2'), t('settings.io.step3'), t('settings.io.step4')];

  return (
    <div className="bg-surface-2 border border-line rounded-2xl p-6 md:p-8">
      <h4 className="font-medium text-lg mb-6">{t('settings.io.wizard')}</h4>

      <div className="flex gap-6 mb-8 border-b border-line overflow-x-auto">
        {stepTitles.map((title, i) => (
          <div
            key={title}
            className={`pb-3 text-sm font-medium whitespace-nowrap ${step === i + 1 ? 'border-b-2 border-accent-500 text-accent-400' : 'text-muted'}`}
          >
            {title}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="border-2 border-dashed border-line rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-input">
          <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mb-4">
            <Upload className="w-6 h-6 text-muted" />
          </div>
          <p className="text-secondary font-medium mb-2">{t('settings.io.drop')}</p>
          <p className="text-muted text-sm mb-6">{t('settings.io.formats')}</p>
          <label className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
            {t('settings.io.choose')}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('settings.io.mapHint')}</p>

          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
            {headers.map(header => (
              <div key={header} className="flex items-center gap-4">
                <span className="flex-1 text-sm text-secondary truncate" title={header}>{header}</span>
                <select
                  value={mapping[header] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [header]: e.target.value as TargetField | '' })}
                  className="w-56 bg-app border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                >
                  <option value="">{t('settings.io.notMapped')}</option>
                  {TARGET_FIELDS.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={reset} className="bg-surface-3 hover:bg-surface-hover border border-line px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {t('settings.io.back')}
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('settings.io.next')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-emerald-400">{t('settings.io.rowsValid', { n: validRows.length })}</span>
            <span className="text-rose-400">{t('settings.io.rowsInvalid', { n: invalidRows.length })}</span>
          </div>
          <p className="text-xs text-muted">{t('settings.io.previewHint')}</p>

          <div className="border border-line rounded-xl overflow-auto max-h-80 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted uppercase bg-surface-3 sticky top-0">
                <tr>
                  <th className="p-table text-table">{t('settings.io.rowNo')}</th>
                  {TARGET_FIELDS.filter(f => Object.values(mapping).includes(f)).map(field => (
                    <th key={field} className="p-table text-table">{field}</th>
                  ))}
                  <th className="p-table text-table">{t('settings.io.problems')}</th>
                </tr>
              </thead>
              <tbody>
                {prepared.slice(0, 100).map(row => (
                  <tr
                    key={row.index}
                    className={`border-b border-line ${row.problems.length > 0 ? 'bg-rose-500/5' : ''}`}
                  >
                    <td className="p-table text-table text-muted">{row.index + 1}</td>
                    {TARGET_FIELDS.filter(f => Object.values(mapping).includes(f)).map(field => (
                      <td key={field} className="p-table text-table text-secondary">{row.values[field] || '—'}</td>
                    ))}
                    <td className="p-table text-table text-xs text-rose-400">
                      {row.problems.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          {row.problems.join('; ')}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)} className="bg-surface-3 hover:bg-surface-hover border border-line px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {t('settings.io.back')}
            </button>
            <button
              onClick={handleImport}
              disabled={busy || validRows.length === 0}
              className="bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {t('settings.io.doImport')}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6" />
          </div>
          <p className="text-primary font-medium">{t('settings.io.imported', { n: importedCount ?? 0 })}</p>
          <button
            onClick={reset}
            className="mt-6 bg-surface-3 hover:bg-surface-hover border border-line px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {t('settings.io.startOver')}
          </button>
        </div>
      )}
    </div>
  );
}
