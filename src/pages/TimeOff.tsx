import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, Clock3, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const initialRequests = [
  { id: '1', type: 'vacation', dates: '15.08.2024 - 28.08.2024', days: 14, status: 'approved', employee: 'Сидоров Сидор' },
  { id: '2', type: 'sick', dates: '01.07.2024 - 05.07.2024', days: 5, status: 'pending', employee: 'Иванов Иван' },
  { id: '3', type: 'dayoff', dates: '10.06.2024', days: 1, status: 'rejected', employee: 'Смирнова Анна' },
];

export default function TimeOff() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState('my');
  const [requests, setRequests] = useState(initialRequests);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'vacation', dates: '', days: 1 });

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.dates) return;

    setRequests(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: newRequest.type,
      dates: newRequest.dates,
      days: newRequest.days,
      status: 'pending',
      employee: user?.name || t('user.owner')
    }]);

    setNewRequest({ type: 'vacation', dates: '', days: 1 });
    setIsModalOpen(false);
  };
  
  const handleAction = (id: string, status: string) => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
  };

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('timeoff.requestTitle')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRequest} className="p-6 space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('timeoff.dates')} *</label>
                <input
                  type="text"
                  required
                  value={newRequest.dates}
                  onChange={(e) => setNewRequest({ ...newRequest, dates: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  placeholder={t('timeoff.datesPh')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('timeoff.daysCount')} *</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={newRequest.days}
                  onChange={(e) => setNewRequest({ ...newRequest, days: parseInt(e.target.value) })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                />
              </div>
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
          <p className="text-3xl font-bold text-primary mt-4">24 <span className="text-base font-normal text-muted">{t('timeoff.daysUnit')}</span></p>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-primary">{t('timeoff.pendingApproval')}</h3>
          </div>
          <p className="text-3xl font-bold text-primary mt-4">1 <span className="text-base font-normal text-muted">{t('timeoff.requestUnit')}</span></p>
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
              {(activeTab === 'my' ? requests.filter(r => r.employee === user?.name || r.id === '1') : requests).map(req => (
                <tr key={req.id} className="border-b border-line hover:bg-surface-hover">
                  <td className="p-table text-table font-medium text-primary">{t(`timeoff.types.${req.type}`)}</td>
                  <td className="p-table text-table text-muted">{req.dates}</td>
                  <td className="p-table text-table text-muted">{req.days}</td>
                  {activeTab === 'team' && <td className="p-table text-table text-secondary">{req.employee}</td>}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
