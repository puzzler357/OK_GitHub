import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, Clock3, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useDatabaseStore, TABLES } from '../store/useDatabaseStore';
import type { TimeOffRequest } from '../store/useDatabaseStore';

const today = () => new Date().toISOString().split('T')[0];

/** Календарных дней в интервале, включая обе границы. */
function daysBetween(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

// Годовая норма отпуска. Вынесена константой, пока нет настройки в «Общих».
const ANNUAL_VACATION_DAYS = 24;

export default function TimeOff() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const { timeOffRequests, employees, createIn, updateIn } = useDatabaseStore();

  const [activeTab, setActiveTab] = useState('my');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    type: 'vacation',
    dateFrom: today(),
    dateTo: today(),
  });

  const employeeName = (id: string) => employees.find(e => e.id === id)?.fullName ?? '—';

  // «Мои заявки» — заявки сотрудника, чьё имя совпадает с владельцем устройства.
  // Раньше здесь стояло условие с проверкой на конкретный идентификатор '1'.
  const ownEmployeeId = useMemo(
    () => employees.find(e => e.fullName === user?.name)?.id,
    [employees, user?.name],
  );

  const visibleRequests = activeTab === 'my'
    ? timeOffRequests.filter(r => r.employeeId === ownEmployeeId)
    : timeOffRequests;

  // Плитки считаются по данным: раньше здесь стояли константы 24 и 1.
  const currentYear = new Date().getFullYear();
  const usedVacationDays = timeOffRequests
    .filter(r => r.type === 'vacation' && r.status === 'approved'
      && new Date(r.dateFrom).getFullYear() === currentYear
      && (!ownEmployeeId || r.employeeId === ownEmployeeId))
    .reduce((sum, r) => sum + r.days, 0);
  const availableDays = Math.max(0, ANNUAL_VACATION_DAYS - usedVacationDays);
  const pendingCount = timeOffRequests.filter(r => r.status === 'pending').length;

  const requestedDays = daysBetween(newRequest.dateFrom, newRequest.dateTo);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.employeeId || requestedDays <= 0) return;

    await createIn<TimeOffRequest>(TABLES.timeOff, {
      employeeId: newRequest.employeeId,
      type: newRequest.type,
      dateFrom: newRequest.dateFrom,
      dateTo: newRequest.dateTo,
      // Количество дней считается по интервалу, а не вводится руками.
      days: requestedDays,
      status: 'pending',
    });

    setNewRequest({ employeeId: '', type: 'vacation', dateFrom: today(), dateTo: today() });
    setIsModalOpen(false);
  };

  const handleAction = (id: string, status: string) => {
    void updateIn(TABLES.timeOff, id, { status });
  };

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('timeoff.requestTitle')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRequest} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('timeoff.employee')} *</label>
                <select
                  required
                  value={newRequest.employeeId}
                  onChange={(e) => setNewRequest({ ...newRequest, employeeId: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                >
                  <option value="">—</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('timeoff.type')} *</label>
                <select
                  value={newRequest.type}
                  onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                >
                  <option value="vacation">{t('timeoff.types.vacation')}</option>
                  <option value="sick">{t('timeoff.types.sick')}</option>
                  <option value="dayoff">{t('timeoff.types.dayoff')}</option>
                  <option value="remote">{t('timeoff.types.remote')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">{t('timeoff.dateFrom')} *</label>
                  <input
                    type="date"
                    required
                    value={newRequest.dateFrom}
                    onChange={(e) => setNewRequest({ ...newRequest, dateFrom: e.target.value })}
                    className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">{t('timeoff.dateTo')} *</label>
                  <input
                    type="date"
                    required
                    min={newRequest.dateFrom}
                    value={newRequest.dateTo}
                    onChange={(e) => setNewRequest({ ...newRequest, dateTo: e.target.value })}
                    className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  />
                </div>
              </div>
              <p className="text-sm text-muted">
                {t('timeoff.daysCount')}: <span className="text-primary font-medium">{requestedDays}</span>
              </p>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('timeoff.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('timeoff.manageTitle')}</h2>
          <p className="text-muted mt-1">{t('timeoff.subtitle')}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
          <CalendarIcon className="w-4 h-4" />
          {t('timeoff.submitRequest')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-primary">{t('timeoff.availableDays')}</h3>
          </div>
          <p className="text-3xl font-bold text-primary mt-4">{availableDays} <span className="text-base font-normal text-muted">{t('timeoff.daysUnit')}</span></p>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-primary">{t('timeoff.pendingApproval')}</h3>
          </div>
          <p className="text-3xl font-bold text-primary mt-4">{pendingCount} <span className="text-base font-normal text-muted">{t('timeoff.requestUnit')}</span></p>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden mt-8">
        <div className="flex border-b border-line">
          <button 
            onClick={() => setActiveTab('my')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'my' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
          >
            {t('timeoff.myRequests')}
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'team' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
          >
            {t('timeoff.teamRequests')}
          </button>
        </div>

        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted bg-surface border-b border-line">
              <tr>
                <th className="p-table text-table font-medium">{t('timeoff.colType')}</th>
                <th className="p-table text-table font-medium">{t('timeoff.colDates')}</th>
                <th className="p-table text-table font-medium">{t('timeoff.colDays')}</th>
                {activeTab === 'team' && <th className="p-table text-table font-medium">{t('timeoff.colEmployee')}</th>}
                <th className="p-table text-table font-medium">{t('employees.col.status')}</th>
                {activeTab === 'team' && <th className="p-table text-table font-medium text-right">{t('timeoff.colActions')}</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map(req => (
                <tr key={req.id} className="border-b border-line hover:bg-surface-hover">
                  <td className="p-table text-table font-medium text-primary">{t(`timeoff.types.${req.type}`)}</td>
                  <td className="p-table text-table text-muted">{req.dateFrom} — {req.dateTo}</td>
                  <td className="p-table text-table text-muted">{req.days}</td>
                  {activeTab === 'team' && <td className="p-table text-table text-secondary">{employeeName(req.employeeId)}</td>}
                  <td className="p-table text-table">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      req.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {req.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {req.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                      {req.status === 'pending' && <Clock3 className="w-3.5 h-3.5" />}
                      {req.status === 'approved' ? t('timeoff.status.approved') : req.status === 'rejected' ? t('timeoff.status.rejected') : t('timeoff.status.pending')}
                    </div>
                  </td>
                  {activeTab === 'team' && (
                    <td className="p-table text-table text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleAction(req.id, 'approved')} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title={t('timeoff.approve')}>
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleAction(req.id, 'rejected')} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title={t('timeoff.reject')}>
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {visibleRequests.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'team' ? 6 : 4} className="p-table text-table text-center text-muted py-8">
                    {t('timeoff.noRequests')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
