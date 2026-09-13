import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Состояния экрана: загрузка и ошибка.
 *
 * Пустые состояния на экранах уже были, а загрузки и ошибки — нигде: при
 * сбое fetchAll писал в консоль, а пользователь видел пустые таблицы без
 * объяснения, почему они пустые.
 */

/** Скелет строки таблицы: серые полосы вместо данных. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="p-4 space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 rounded bg-surface-3 animate-pulse"
              // Разная ширина — чтобы скелет читался как таблица, а не как
              // ровная сетка из одинаковых прямоугольников.
              style={{ flex: colIndex === 0 ? 3 : colIndex === columns - 1 ? 1 : 2 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Скелет карточек — для экранов, где данные показываются плитками. */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-line rounded-2xl p-6 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-surface-3 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-surface-3 animate-pulse" />
          <div className="h-6 w-1/3 rounded bg-surface-3 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Экран ошибки загрузки с повтором. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-primary">{t('states.loadFailed')}</h3>
        {/* Текст ошибки показываем как есть: без него непонятно, чинить
            подключение, права на файл базы или что-то ещё. */}
        <p className="text-sm text-muted mt-2 max-w-md break-words">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        {t('states.retry')}
      </button>
    </div>
  );
}
