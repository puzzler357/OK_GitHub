/**
 * Наполнение базы данными боевого объёма для проверки порога из ТЗ:
 * 10 000 сотрудников, плавная прокрутка, основные экраны ≤ 1 с.
 *
 * Без такого сида утверждение «≤ 1 с» непроверяемо — на пяти демо-записях
 * любой экран быстрый.
 *
 * Запуск:
 *   npm run seed:load                       # 10 000 сотрудников, табель за текущий год
 *   npm run seed:load -- --employees=1000   # другой объём
 *   npm run seed:load -- --no-timesheets    # только сотрудники
 *   npm run seed:load -- --db=./big.db      # в отдельный файл, не трогая рабочий
 *
 * По умолчанию пишет в ту же базу, что и приложение. Чтобы не смешивать
 * тестовый объём с рабочими данными, задайте --db или переменную DB_PATH.
 */
import path from 'node:path';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

const dbArg = arg('db');
if (dbArg) {
  // Выставляем до импорта модуля базы: он читает DB_PATH при загрузке.
  process.env.DB_PATH = path.resolve(dbArg);
}

const employeeCount = Number(arg('employees') ?? 10_000);
const year = Number(arg('year') ?? new Date().getFullYear());
const withTimesheets = !process.argv.includes('--no-timesheets');

const SURNAMES = ['Иванов', 'Петров', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Новиков', 'Морозов', 'Волков', 'Лебедев', 'Аманмурадов', 'Бердыев', 'Оразов', 'Нурыев', 'Гурбанов'];
const NAMES = ['Иван', 'Пётр', 'Сергей', 'Андрей', 'Дмитрий', 'Анна', 'Мария', 'Ольга', 'Айгуль', 'Мердан', 'Гульнара', 'Батыр'];
const PATRONYMICS = ['Иванович', 'Петрович', 'Сергеевич', 'Андреевна', 'Дмитриевна', 'Оглы', 'Кызы'];
const POSITIONS = ['Старший разработчик', 'Разработчик', 'Аналитик данных', 'Менеджер по продажам', 'HR Специалист', 'Junior Дизайнер', 'Бухгалтер', 'Юрист', 'Логист', 'Инженер'];
const DEPARTMENTS = ['IT', 'Продажи', 'HR', 'Аналитика', 'Дизайн', 'Бухгалтерия', 'Юридический', 'Логистика', 'Производство', 'Снабжение'];
const STATUSES = ['active', 'active', 'active', 'on_leave', 'probation'];

// Детерминированный генератор: один и тот же сид даёт одну и ту же базу,
// поэтому замеры между прогонами сравнимы.
let seed = 20260913;
function random(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick<T>(list: T[]): T {
  return list[Math.floor(random() * list.length)];
}

async function main() {
  const { default: db } = await import('../src/db/sqlite');

  console.log(`База: ${process.env.DB_PATH || path.join(process.cwd(), 'local-hr-docs.db')}`);
  console.log(`Сотрудников: ${employeeCount}, табель за ${year} год: ${withTimesheets ? 'да' : 'нет'}`);

  const startedAt = Date.now();

  const insertEmployee = db.prepare(
    'INSERT INTO employees (id, full_name, position, department, status, hire_date, tab_number, birth_date, payment_type, salary, rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );

  const ids: string[] = [];
  db.transaction(() => {
    for (let i = 0; i < employeeCount; i++) {
      const id = `load-${i}`;
      ids.push(id);
      insertEmployee.run(
        id,
        `${pick(SURNAMES)} ${pick(NAMES)} ${pick(PATRONYMICS)}`,
        pick(POSITIONS),
        pick(DEPARTMENTS),
        pick(STATUSES),
        `20${10 + Math.floor(random() * 16)}-${String(1 + Math.floor(random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(random() * 28)).padStart(2, '0')}`,
        String(100000 + i),
        null,
        'salary',
        Math.round((3000 + random() * 22000) / 50) * 50,
        pick([1, 1, 1, 0.5, 0.25, 1.5]),
      );
    }
  })();

  console.log(`Сотрудники: ${employeeCount} за ${Date.now() - startedAt} мс`);

  if (withTimesheets) {
    const timesheetStart = Date.now();
    const insertTimesheet = db.prepare(
      'INSERT INTO timesheets (id, year, month, employee_id, days) VALUES (?, ?, ?, ?, ?)',
    );

    let rows = 0;
    // Месяцы 0-11: экран табеля работает с getMonth(), и запись в базе
    // должна совпадать с тем, что он ищет.
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      db.transaction(() => {
        for (const employeeId of ids) {
          const days: Record<number, string> = {};
          for (let day = 1; day <= daysInMonth; day++) {
            const weekday = new Date(year, month, day).getDay();
            days[day] = weekday === 0 || weekday === 6 ? 'В' : pick(['Я', 'Я', 'Я', 'Я', 'О', 'Б']);
          }
          insertTimesheet.run(`load-ts-${employeeId}-${year}-${month}`, year, month, employeeId, JSON.stringify(days));
          rows++;
        }
      })();
    }

    console.log(`Табель: ${rows} записей за ${Date.now() - timesheetStart} мс`);
  }

  const counts = ['employees', 'timesheets', 'archives'].map((table) => {
    const { c } = db.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number };
    return `${table}=${c}`;
  });

  console.log(`Готово за ${Date.now() - startedAt} мс. В базе: ${counts.join(', ')}`);
  console.log('Что замерять: холодный старт до дашборда, открытие «Сотрудников», прокрутку, открытие «Табеля», выгрузку в Excel.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
