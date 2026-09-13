import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import { DEFAULT_CURRENCY } from '../lib/money';
import type { CurrencyDecimals, CurrencyPosition, ThousandsSeparator } from '../lib/money';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'indigo' | 'purple' | 'blue' | 'emerald' | 'rose' | 'amber';
type Density = 'compact' | 'standard' | 'spacious';
type FontSize = 'small' | 'standard' | 'large';

interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
}

interface AppState {
  theme: Theme;
  accentColor: AccentColor;
  density: Density;
  fontSize: FontSize;
  language: string;
  sidebarOpen: boolean;
  user: User | null;
  token: string | null;

  // Формат денежных сумм — «Настройки → Общие».
  currencySymbol: string;
  currencyPosition: CurrencyPosition;
  currencyDecimals: CurrencyDecimals;
  thousandsSeparator: ThousandsSeparator;
  setCurrencySymbol: (symbol: string) => void;
  setCurrencyPosition: (position: CurrencyPosition) => void;
  setCurrencyDecimals: (decimals: CurrencyDecimals) => void;
  setThousandsSeparator: (separator: ThousandsSeparator) => void;

  /** Путь к .docx-бланку для генерации документов (см. scripts/makeDocxTemplate.ts). */
  docxTemplatePath: string;
  setDocxTemplatePath: (path: string) => void;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setDensity: (density: Density) => void;
  setFontSize: (size: FontSize) => void;
  setLanguage: (lang: string) => void;
  toggleSidebar: () => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

// Приложение однопользовательское: единственная роль — владелец устройства.
export type Role = 'ADMIN';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      accentColor: 'indigo',
      density: 'standard',
      fontSize: 'standard',
      language: 'ru',
      sidebarOpen: true,
      user: null,
      token: null,

      currencySymbol: DEFAULT_CURRENCY.currencySymbol,
      currencyPosition: DEFAULT_CURRENCY.currencyPosition,
      currencyDecimals: DEFAULT_CURRENCY.currencyDecimals,
      thousandsSeparator: DEFAULT_CURRENCY.thousandsSeparator,
      setCurrencySymbol: (currencySymbol) => set({ currencySymbol }),
      setCurrencyPosition: (currencyPosition) => set({ currencyPosition }),
      setCurrencyDecimals: (currencyDecimals) => set({ currencyDecimals }),
      setThousandsSeparator: (thousandsSeparator) => set({ thousandsSeparator }),

      docxTemplatePath: '/templates/blank.docx',
      setDocxTemplatePath: (docxTemplatePath) => set({ docxTemplatePath }),
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setAccentColor: (accentColor) => {
        set({ accentColor });
        applyAccentColor(accentColor);
      },
      setDensity: (density) => {
        set({ density });
        applyDensity(density);
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        applyFontSize(fontSize);
      },
      setLanguage: (language) => {
        set({ language });
        i18n.changeLanguage(language);
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'hr-docs-app-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyAccentColor(state.accentColor);
          applyDensity(state.density);
          applyFontSize(state.fontSize);
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
    return;
  }
  root.classList.add(theme);
}

function applyAccentColor(color: AccentColor) {
  const root = window.document.documentElement;
  root.classList.remove('theme-indigo', 'theme-purple', 'theme-blue', 'theme-emerald', 'theme-rose', 'theme-amber');
  root.classList.add(`theme-${color}`);
}

function applyDensity(density: Density) {
  const root = window.document.documentElement;
  root.classList.remove('density-compact', 'density-standard', 'density-spacious');
  root.classList.add(`density-${density}`);
}

function applyFontSize(size: FontSize) {
  const root = window.document.documentElement;
  root.classList.remove('text-size-small', 'text-size-standard', 'text-size-large');
  root.classList.add(`text-size-${size}`);
}


if (typeof window !== 'undefined') {
  try {
    const storedStr = localStorage.getItem('hr-docs-app-storage');
    if (storedStr) {
      const stored = JSON.parse(storedStr);
      if (stored && stored.state) {
        if (stored.state.theme) applyTheme(stored.state.theme);
        if (stored.state.accentColor) applyAccentColor(stored.state.accentColor);
        if (stored.state.density) applyDensity(stored.state.density);
        if (stored.state.fontSize) applyFontSize(stored.state.fontSize);
      }
    } else {
      applyTheme('dark');
      applyAccentColor('indigo');
      applyDensity('standard');
      applyFontSize('standard');
    }
  } catch (e) {
    console.error('Failed to restore settings', e);
  }
}
