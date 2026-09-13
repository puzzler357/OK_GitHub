/** Все маршруты приложения из src/App.tsx — держим список синхронным с роутером. */
export const ROUTES: { path: string; title: string }[] = [
  { path: '/dashboard', title: 'Дашборд' },
  { path: '/employees', title: 'Сотрудники' },
  { path: '/org-chart', title: 'Оргструктура' },
  { path: '/movements', title: 'Кадровые движения' },
  { path: '/templates', title: 'Шаблоны' },
  { path: '/templates/new', title: 'Конструктор шаблонов' },
  { path: '/generate', title: 'Генерация документов' },
  { path: '/reports', title: 'Отчёты' },
  { path: '/timesheet', title: 'Табель' },
  { path: '/calendar', title: 'Календарь' },
  { path: '/recruiting', title: 'Подбор' },
  { path: '/timeoff', title: 'Отпуска и отсутствия' },
  { path: '/onboarding', title: 'Онбординг' },
  { path: '/performance', title: 'Оценка' },
  { path: '/knowledge-base', title: 'База знаний' },
  { path: '/archive', title: 'Архив' },
  { path: '/settings', title: 'Настройки' },
  { path: '/profile', title: 'Профиль' },
];

/** Отдельно — редирект с корня, он не является самостоятельной страницей. */
export const ROOT_REDIRECT = { from: '/', to: '/dashboard' };
