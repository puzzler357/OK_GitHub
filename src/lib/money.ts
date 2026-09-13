// Единственное место, где сумма превращается в строку.
//
// До этого в коде был разнобой: рубли в «Сотрудниках», манаты в «Оргструктуре»
// и «Архиве», а на дашборде сумма делилась на миллион и подписывалась «M» без
// единицы вообще. Символ, его позиция, число знаков и разделитель разрядов
// теперь настраиваются в «Настройки → Общие» и хранятся в useAppStore.
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

export type CurrencyPosition = 'prefix' | 'suffix';
export type CurrencyDecimals = 0 | 2;
export type ThousandsSeparator = 'space' | 'comma' | 'dot' | 'none';

export interface CurrencySettings {
  currencySymbol: string;
  currencyPosition: CurrencyPosition;
  currencyDecimals: CurrencyDecimals;
  thousandsSeparator: ThousandsSeparator;
}

// Неразрывный пробел: сумма не должна переноситься по разрядам или отрываться
// от символа валюты.
const NBSP = ' ';

const SEPARATOR_CHARS: Record<ThousandsSeparator, string> = {
  space: NBSP,
  comma: ',',
  dot: '.',
  none: '',
};

export const DEFAULT_CURRENCY: CurrencySettings = {
  currencySymbol: 'TMT',
  currencyPosition: 'suffix',
  currencyDecimals: 0,
  thousandsSeparator: 'space',
};

interface FormatOptions {
  /** Короткая запись для плиток дашборда: «2,5 млн» средствами Intl. */
  compact?: boolean;
  /** Язык интерфейса; нужен только для compact. */
  locale?: string;
}

function groupDigits(intPart: string, separator: string): string {
  if (!separator) return intPart;
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatNumber(value: number, settings: CurrencySettings, opts: FormatOptions): string {
  if (opts.compact) {
    // Intl сам подберёт локализованное сокращение: «2,5 млн» / «2.5M».
    try {
      return new Intl.NumberFormat(opts.locale || 'ru', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    } catch {
      // Экзотическая локаль — падать из-за плитки на дашборде не станем.
    }
  }

  const separator = SEPARATOR_CHARS[settings.thousandsSeparator];
  // Запятая как разделитель разрядов исключает запятую как десятичный знак.
  const decimalMark = settings.thousandsSeparator === 'comma' ? '.' : ',';

  const fixed = Math.abs(value).toFixed(settings.currencyDecimals);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = groupDigits(intPart, separator);
  const body = fracPart ? `${grouped}${decimalMark}${fracPart}` : grouped;

  return value < 0 ? `-${body}` : body;
}

/** Чистая функция форматирования — настройки передаются явно. */
export function formatMoney(value: number, settings: CurrencySettings, opts: FormatOptions = {}): string {
  const number = formatNumber(value, settings, opts);
  return settings.currencyPosition === 'prefix'
    ? `${settings.currencySymbol}${NBSP}${number}`
    : `${number}${NBSP}${settings.currencySymbol}`;
}

/**
 * Хук для компонентов: подписывается на настройки валюты и языка, поэтому
 * суммы пересчитываются сразу после смены параметров в «Настройках».
 */
export function useMoney() {
  const currencySymbol = useAppStore((s) => s.currencySymbol);
  const currencyPosition = useAppStore((s) => s.currencyPosition);
  const currencyDecimals = useAppStore((s) => s.currencyDecimals);
  const thousandsSeparator = useAppStore((s) => s.thousandsSeparator);
  const language = useAppStore((s) => s.language);

  return useMemo(() => {
    const settings: CurrencySettings = { currencySymbol, currencyPosition, currencyDecimals, thousandsSeparator };
    return {
      settings,
      format: (value: number, opts?: FormatOptions) =>
        formatMoney(value, settings, { locale: language, ...opts }),
    };
  }, [currencySymbol, currencyPosition, currencyDecimals, thousandsSeparator, language]);
}
