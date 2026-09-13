import { describe, expect, it } from 'vitest';
import { ru } from '../../src/locales/ru';
import { en } from '../../src/locales/en';
import { tk } from '../../src/locales/tk';

/**
 * Паритет ключей проверялся глазами — то есть не проверялся. Пропущенный ключ
 * не ломает сборку: i18next молча покажет сам ключ вместо текста, и заметит
 * это только тот, кто переключится на этот язык.
 */

type Tree = Record<string, unknown>;

function flatten(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value as Tree).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key));
}

const bundles = {
  ru: flatten(ru).sort(),
  en: flatten(en).sort(),
  tk: flatten(tk).sort(),
};

describe('локализация', () => {
  it('русский набор непустой — иначе проверка ниже бессмысленна', () => {
    expect(bundles.ru.length).toBeGreaterThan(200);
  });

  it.each(['en', 'tk'] as const)('в %s нет пропущенных ключей относительно ru', (lang) => {
    const missing = bundles.ru.filter(key => !bundles[lang].includes(key));
    expect(missing, `нет перевода: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(['en', 'tk'] as const)('в %s нет лишних ключей, которых нет в ru', (lang) => {
    const extra = bundles[lang].filter(key => !bundles.ru.includes(key));
    expect(extra, `лишние ключи: ${extra.join(', ')}`).toEqual([]);
  });

  it('месяцы и дни недели заданы во всех языках полностью', () => {
    for (const [lang, bundle] of Object.entries({ ru, en, tk })) {
      const months = (bundle as any).translation.timesheet.months as string[];
      const weekdays = (bundle as any).translation.calendar.weekdays as string[];

      expect(months, `${lang}: месяцы`).toHaveLength(12);
      expect(weekdays, `${lang}: дни недели`).toHaveLength(7);
      expect(months.every(m => typeof m === 'string' && m.length > 0), `${lang}: пустой месяц`).toBe(true);
    }
  });

  it('не осталось пустых строк перевода', () => {
    for (const [lang, bundle] of Object.entries({ ru, en, tk })) {
      const empty: string[] = [];
      const walk = (value: unknown, prefix: string) => {
        if (typeof value === 'string') {
          if (value.trim() === '') empty.push(prefix);
          return;
        }
        if (Array.isArray(value) || value === null || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value as Tree)) {
          walk(child, prefix ? `${prefix}.${key}` : key);
        }
      };
      walk(bundle, '');
      expect(empty, `${lang}: пустые значения ${empty.join(', ')}`).toEqual([]);
    }
  });
});
