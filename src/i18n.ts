import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { ru } from './locales/ru';
import { tk } from './locales/tk';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      ru,
      tk
    },
    lng: 'ru', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
