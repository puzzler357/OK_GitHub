import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useMoney } from '../lib/money';
import { User, Mail, Briefcase, Shield, Key, FileText, Calendar as CalendarIcon, Laptop, CheckSquare, Download } from 'lucide-react';

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const money = useMoney();
  const [activeTab, setActiveTab] = useState('overview');

  const payslips = [
    { id: 1, month: 'Июль 2024', amount: money.format(125000), status: 'Выплачено' },
    { id: 2, month: 'Июнь 2024', amount: money.format(125000), status: 'Выплачено' },
    { id: 3, month: 'Май 2024', amount: money.format(125000), status: 'Выплачено' },
  ];

  const timeOffs = [
    { id: 1, type: 'Отпуск', dates: '15.08.2024 - 28.08.2024', days: 14, status: 'Согласовано' },
    { id: 2, type: 'Больничный', dates: '01.07.2024 - 05.07.2024', days: 5, status: 'Закрыт' },
  ];

  const equipment = [
    { id: 1, type: 'Ноутбук', model: 'MacBook Pro 16" M2', date: '10.01.2024', status: 'Выдано' },
    { id: 2, type: 'Монитор', model: 'Dell UltraSharp 27"', date: '10.01.2024', status: 'Выдано' },
    { id: 3, type: 'Мышь', model: 'Logitech MX Master 3S', date: '12.01.2024', status: 'Выдано' },
  ];

  const tasks = [
    { id: 1, title: 'Ознакомление с кодовой базой', status: 'Выполнено' },
    { id: 2, title: 'Настройка рабочего окружения', status: 'Выполнено' },
    { id: 3, title: 'Релиз первой фичи', status: 'В процессе' },
    { id: 4, title: 'Встреча с HR', status: 'Ожидает' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-primary">{t('profile.title')}</h2>
      
      <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-accent-500 to-purple-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-line flex items-center justify-center text-3xl font-bold text-accent-400 shadow-sm">
              {user?.name?.[0] || 'U'}
            </div>
            <button className="bg-surface border border-line hover:bg-surface-hover text-secondary px-4 py-2 rounded-xl font-medium transition-colors shadow-sm mb-2">
              {t('profile.editProfile')}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary">{user?.name}</h3>
                <p className="text-muted">{t('user.owner')}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-5 h-5 text-muted" />
                  <span className="font-medium text-primary">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-5 h-5 text-muted" />
                  <span className="font-medium text-muted">{t('profile.company')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-6 border-t md:border-t-0 md:border-l border-line pt-6 md:pt-0 md:pl-8">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Key className="w-4 h-4 text-accent-500" />
                {t('profile.security')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-primary">{t('profile.password')}</p>
                    <p className="text-xs text-muted">{t('profile.passwordChanged')}</p>
                  </div>
                  <button className="text-sm font-medium text-accent-400 hover:text-accent-300">
                    {t('profile.change')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-8">
              <div className="flex border-b border-line mb-6 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
                >
                  {t('profile.tabs.overview')}
                </button>
                <button 
                  onClick={() => setActiveTab('payslips')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'payslips' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
                >
                  <FileText className="w-4 h-4" /> {t('profile.tabs.payslips')}
                </button>
                <button 
                  onClick={() => setActiveTab('timeoff')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'timeoff' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
                >
                  <CalendarIcon className="w-4 h-4" /> {t('profile.tabs.timeoff')}
                </button>
                <button 
                  onClick={() => setActiveTab('equipment')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'equipment' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
                >
                  <Laptop className="w-4 h-4" /> {t('profile.tabs.equipment')}
                </button>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'tasks' ? 'border-accent-500 text-accent-400' : 'border-transparent text-muted hover:text-secondary'}`}
                >
                  <CheckSquare className="w-4 h-4" /> {t('profile.tabs.tasks')}
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-2 p-5 rounded-xl border border-line">
                    <h4 className="font-medium text-primary mb-2">{t('profile.probationStatus')}</h4>
                    <div className="w-full bg-surface-4 rounded-full h-2 mb-2">
                      <div className="bg-accent-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-xs text-muted">{t('profile.daysLeft', { n: 36 })}</p>
                  </div>
                  <div className="bg-surface-2 p-5 rounded-xl border border-line">
                    <h4 className="font-medium text-primary mb-2">{t('profile.vacationDays')}</h4>
                    <p className="text-2xl font-bold text-emerald-400">14 <span className="text-sm font-normal text-muted">{t('profile.daysUnit')}</span></p>
                  </div>
                </div>
              )}

              {activeTab === 'payslips' && (
                <div className="space-y-3">
                  {payslips.map(slip => (
                    <div key={slip.id} className="flex items-center justify-between p-4 bg-surface-2 border border-line rounded-xl hover:bg-surface-hover transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-accent-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">{slip.month}</p>
                          <p className="text-xs text-emerald-400">{slip.amount} • {slip.status}</p>
                        </div>
                      </div>
                      <button className="p-2 text-muted hover:text-primary transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'timeoff' && (
                <div className="space-y-3">
                  {timeOffs.map(to => (
                    <div key={to.id} className="flex items-center justify-between p-4 bg-surface-2 border border-line rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-blue-400">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">{to.type}</p>
                          <p className="text-xs text-muted">{to.dates} ({to.days} {t('profile.daysUnit')})</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                        {to.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'equipment' && (
                <div className="space-y-3">
                  {equipment.map(eq => (
                    <div key={eq.id} className="flex items-center justify-between p-4 bg-surface-2 border border-line rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-purple-400">
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">{eq.type}</p>
                          <p className="text-xs text-muted">{eq.model} • Выдано: {eq.date}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400">
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-4 p-4 bg-surface-2 border border-line rounded-xl">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.status === 'Выполнено' ? 'bg-accent-500 border-accent-500 text-white' : 'border-strong'}`}>
                        {task.status === 'Выполнено' && <CheckSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${task.status === 'Выполнено' ? 'text-muted line-through' : 'text-primary'}`}>{task.title}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        task.status === 'Выполнено' ? 'bg-emerald-500/10 text-emerald-400' : 
                        task.status === 'В процессе' ? 'bg-blue-500/10 text-blue-400' : 
                        'bg-surface-3 text-muted'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>

        </div>
      </div>
    </div>
  );
}
