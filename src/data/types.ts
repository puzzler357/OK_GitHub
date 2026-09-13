// Общие типы сущностей для слоя доступа к данным.
// Используются и стором, и веб/Tauri-реализациями.

export interface Department {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface Position {
  id: string;
  departmentId: string;
  title: string;
  maxCount: number;
  salary: number;
}

export interface Employee {
  id: string;
  fullName: string;
  position: string;
  department: string;
  status: 'active' | 'on_leave' | 'probation' | 'dismissed';
  hireDate: string;
  /** Табельный номер — кадровый реквизит, задаётся вручную или приходит из импорта. */
  tabNumber?: string;
  birthDate?: string;
  paymentType?: 'salary' | 'hourly' | 'piecework';
  salary?: number;
  rate?: number;
}

export interface TimesheetRecord {
  id: string;
  year: number;
  month: number;
  employeeId: string;
  days: Record<number, string>;
}

export interface ArchiveRecord {
  id: string;
  year: number;
  month: number;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  salary: number;
  hoursWorked: number;
}

/** Срез архива: экран запрашивает только то, что показывает. */
export interface ArchiveFilters {
  year?: number;
  department?: string;
  employeeId?: string;
}

export interface Template {
  id: string;
  name: string;
  blocks: { id: string; type: string; content: string }[];
}

// ---- Сущности экранов, переведённых на БД (см. entities.ts) ----

export type CandidateStatus = 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface Candidate {
  id: string;
  fullName: string;
  position: string;
  experience?: string;
  status: CandidateStatus;
  createdAt: string;
  note?: string;
}

export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  /** vacation | sick | unpaid | remote */
  type: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  status: TimeOffStatus;
  comment?: string;
}

export interface ChecklistTask {
  id: string;
  employeeId: string;
  kind: 'onboarding' | 'offboarding';
  title: string;
  assignee?: string;
  done: boolean;
  comment?: string;
  orderIndex: number;
}

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  /** Процент выполнения, 0-100. */
  progress: number;
  /** active | done | overdue */
  status: string;
  period: string;
}

export interface Review {
  id: string;
  employeeId: string;
  reviewer: string;
  period: string;
  score: number;
  comment?: string;
}

export type MovementType = 'hire' | 'transfer' | 'dismissal';

/**
 * Кадровая операция. Пишется вместе с изменением карточки сотрудника одной
 * транзакцией: запись о переводе без самого перевода (и наоборот) —
 * рассогласование, которое потом никак не разобрать.
 */
export interface Movement {
  id: string;
  employeeId: string;
  type: MovementType;
  date: string;
  fromPosition?: string;
  toPosition?: string;
  fromDepartment?: string;
  toDepartment?: string;
  fromSalary: number;
  toSalary: number;
  orderNo?: string;
  reason?: string;
}

/** Запись журнала аудита. Пишется слоем данных, а не экранами. */
export interface AuditEntry {
  id: string;
  /** ISO-время события. */
  ts: string;
  action: string;
  entity: string;
  entityId?: string;
  /** Человекочитаемое описание изменения. */
  diff?: string;
}

/** Сохранённая настройка конструктора отчётов. */
export interface ReportPreset {
  id: string;
  name: string;
  /** JSON: источник, выбранные поля, фильтры, группировка. */
  config: string;
}

export interface KbCategory {
  id: string;
  name: string;
  orderIndex: number;
}

export interface KbArticle {
  id: string;
  categoryId?: string;
  title: string;
  contentHtml?: string;
  reads: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
}

export interface LoginResult {
  user: AuthUser;
  token: string;
}
