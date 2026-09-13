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
  status: 'active' | 'on_leave' | 'probation';
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

export interface Template {
  id: string;
  name: string;
  blocks: { id: string; type: string; content: string }[];
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
