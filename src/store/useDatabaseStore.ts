import { create } from 'zustand';
import * as api from '../data';
import type {
  Employee, Department, Position, TimesheetRecord, ArchiveRecord, ArchiveFilters, Template,
} from '../data/types';

// Ре-экспорт типов: страницы импортируют их из этого модуля.
export type { Employee, Department, Position, TimesheetRecord, ArchiveRecord, ArchiveFilters, Template } from '../data/types';

// У тех, кто уже пользовался приложением, в localStorage лежит слепок стора
// от прежней версии с persist. Он больше не читается и только занимает квоту —
// удаляем один раз при загрузке модуля.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('hr-docs-local-db');
  } catch {
    /* приватный режим или запрет на доступ к хранилищу — не критично */
  }
}

interface DatabaseState {
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  setEmployees: (emps: Employee[]) => void;
  /** Массовый импорт: пишет строки в БД одной транзакцией и добавляет их в стор. */
  importEmployees: (rows: Omit<Employee, 'id'>[]) => Promise<number>;

  timesheets: TimesheetRecord[];
  addTimesheet: (record: Omit<TimesheetRecord, 'id'>) => void;
  updateTimesheet: (id: string, record: Partial<TimesheetRecord>) => void;
  deleteTimesheet: (id: string) => void;

  archives: ArchiveRecord[];
  /** Значения для фильтров архива, считанные по всей таблице. */
  archiveFacets: { years: number[]; departments: string[] };
  departments: Department[];
  positions: Position[];
  addArchive: (record: Omit<ArchiveRecord, 'id'>) => void;
  deleteArchive: (id: string) => void;
  templates: Template[];
  addTemplate: (template: Omit<Template, 'id'>) => void;
  updateTemplate: (id: string, template: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  addDepartment: (dep: Omit<Department, 'id'>) => Promise<void>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addPosition: (pos: Omit<Position, 'id'>) => Promise<void>;
  updatePosition: (id: string, data: Partial<Position>) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
}

// Источник истины — SQLite; стор держит только оперативный кэш.
//
// Раньше он был обёрнут в persist без partialize, то есть все шесть массивов
// сущностей целиком уезжали в localStorage при каждой мутации. При 10 000
// сотрудников и годе табелей это выходило за квоту (~5 МБ) и заставляло
// пересериализовывать стор на каждый клик по ячейке табеля. Вторая копия
// данных вдобавок маскировала дефект импорта Excel: строки «жили» в
// localStorage, хотя в базу не попадали.
//
// Настройки интерфейса persist сохраняет — но это useAppStore, десяток
// скалярных полей, а не таблицы.
interface FetchActions {
  fetchAll: () => Promise<void>;
  fetchTimesheets: (year: number, month: number) => Promise<void>;
  fetchArchives: (filters: ArchiveFilters) => Promise<void>;
  fetchArchiveFacets: () => Promise<void>;
}

export const useDatabaseStore = create<DatabaseState & FetchActions>()(
  (set) => ({
    employees: [],
    departments: [],
    positions: [],
    timesheets: [],
    archives: [],
    archiveFacets: { years: [], departments: [] },
    templates: [],

    // Справочники грузятся целиком — их размер ограничен штатом и структурой.
    // Табель и архив сюда не входят: они растут линейно по времени, и их
    // запрашивают срезом экраны, которым они нужны.
    fetchAll: async () => {
      try {
        const [employees, templates, departments, positions] = await Promise.all([
          api.listEmployees(),
          api.listTemplates(),
          api.listDepartments(),
          api.listPositions(),
        ]);
        set({ employees, templates, departments, positions });
      } catch (e) {
        console.error('Failed to fetch initial data', e);
      }
    },

    fetchTimesheets: async (year, month) => {
      try {
        set({ timesheets: await api.listTimesheets(year, month) });
      } catch (e) {
        console.error('Failed to fetch timesheets', e);
      }
    },

    fetchArchives: async (filters) => {
      try {
        set({ archives: await api.listArchives(filters) });
      } catch (e) {
        console.error('Failed to fetch archives', e);
      }
    },

    fetchArchiveFacets: async () => {
      try {
        set({ archiveFacets: await api.listArchiveFacets() });
      } catch (e) {
        console.error('Failed to fetch archive facets', e);
      }
    },

    addEmployee: async (emp) => {
      const { id } = await api.createEmployee(emp);
      set((state) => ({ employees: [...state.employees, { id, ...emp }] }));
    },
    updateEmployee: async (id, updated) => {
      set((state) => ({ employees: state.employees.map((e) => (e.id === id ? { ...e, ...updated } : e)) }));
      await api.updateEmployee(id, updated);
    },
    deleteEmployee: async (id) => {
      set((state) => ({ employees: state.employees.filter((e) => e.id !== id) }));
      await api.deleteEmployee(id);
    },
    setEmployees: (emps) => {
      set({ employees: emps });
    },
    importEmployees: async (rows) => {
      if (rows.length === 0) return 0;
      // Сначала БД, потом стор: раньше импорт менял только стейт, и данные
      // исчезали при первом же fetchAll().
      const { ids } = await api.createEmployeesBulk(rows);
      const created = rows.map((row, i) => ({ ...row, id: ids[i] }));
      set((state) => ({ employees: [...state.employees, ...created] }));
      return created.length;
    },

    addDepartment: async (dep) => {
      try {
        const { id } = await api.createDepartment(dep);
        set((s) => ({ departments: [...s.departments, { ...dep, id }] }));
      } catch (e) { console.error(e); }
    },
    updateDepartment: async (id, data) => {
      try {
        await api.updateDepartment(id, data);
        set((s) => ({ departments: s.departments.map((d) => (d.id === id ? { ...d, ...data } : d)) }));
      } catch (e) { console.error(e); }
    },
    deleteDepartment: async (id) => {
      try {
        await api.deleteDepartment(id);
        set((s) => ({ departments: s.departments.filter((d) => d.id !== id) }));
      } catch (e) { console.error(e); }
    },
    addPosition: async (pos) => {
      try {
        const { id } = await api.createPosition(pos);
        set((s) => ({ positions: [...s.positions, { ...pos, id }] }));
      } catch (e) { console.error(e); }
    },
    updatePosition: async (id, data) => {
      try {
        await api.updatePosition(id, data);
        set((s) => ({ positions: s.positions.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
      } catch (e) { console.error(e); }
    },
    deletePosition: async (id) => {
      try {
        await api.deletePosition(id);
        set((s) => ({ positions: s.positions.filter((p) => p.id !== id) }));
      } catch (e) { console.error(e); }
    },

    addTimesheet: async (record) => {
      const { id } = await api.createTimesheet(record);
      set((state) => ({ timesheets: [...state.timesheets, { id, ...record }] }));
    },
    updateTimesheet: async (id, updated) => {
      set((state) => ({ timesheets: state.timesheets.map((t) => (t.id === id ? { ...t, ...updated } : t)) }));
      await api.updateTimesheet(id, updated);
    },
    deleteTimesheet: async (id) => {
      set((state) => ({ timesheets: state.timesheets.filter((t) => t.id !== id) }));
      await api.deleteTimesheet(id);
    },

    addArchive: async (record) => {
      const { id } = await api.createArchive(record);
      set((state) => ({ archives: [...state.archives, { id, ...record }] }));
    },
    deleteArchive: async (id) => {
      set((state) => ({ archives: state.archives.filter((a) => a.id !== id) }));
      await api.deleteArchive(id);
    },

    addTemplate: async (template) => {
      const { id } = await api.createTemplate(template);
      set((state) => ({ templates: [...state.templates, { id, ...template }] }));
    },
    updateTemplate: async (id, updated) => {
      set((state) => ({ templates: state.templates.map((t) => (t.id === id ? { ...t, ...updated } : t)) }));
      await api.updateTemplate(id, updated);
    },
    deleteTemplate: async (id) => {
      set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
      await api.deleteTemplate(id);
    },
  }),
);
