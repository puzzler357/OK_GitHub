import { useEffect, useState } from 'react';

/**
 * Отдаёт значение с задержкой после того, как оно перестало меняться.
 *
 * Нужен для полей поиска: фильтрация таблицы идёт по массиву в памяти, и на
 * десяти тысячах записей пересчёт на каждый введённый символ заметно тормозит
 * ввод. С задержкой пересчёт происходит один раз на слово, а не на букву.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
