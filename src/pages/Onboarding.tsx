import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Square, UserPlus, UserMinus, ArrowRight, X } from 'lucide-react';

export default function Onboarding() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('onboarding');

  const [onboarding, setOnboarding] = useState([
    { id: 1, title: 'Подготовка рабочего места', done: true, assignee: 'IT Отдел' },
    { id: 2, title: 'Создание учетных записей (Email, Slack, Jira)', done: true, assignee: 'IT Отдел' },
    { id: 3, title: 'Ознакомление с политиками компании', done: false, assignee: 'HR' },
    { id: 4, title: 'Встреча с руководителем (Welcome Meeting)', done: false, assignee: 'Руководитель' },
    { id: 5, title: 'Выдача пропуска', done: false, assignee: 'Офис-менеджер' },
  ]);

  const [offboarding, setOffboarding] = useState([
    { id: 1, title: 'Блокировка доступов к системам', done: false, assignee: 'IT Отдел' },
    { id: 2, title: 'Сдача техники', done: false, assignee: 'IT Отдел' },
    { id: 3, title: 'Exit Interview', done: false, assignee: 'HR' },
    { id: 4, title: 'Подписание обходного листа', done: false, assignee: 'Сотрудник' },
  ]);

  const [selectedTask, setSelectedTask] = useState<{id: number, title: string, assignee: string, type: string} | null>(null);

  const toggleTask = (id: number, type: 'onboarding' | 'offboarding') => {
    if (type === 'onboarding') {
      setOnboarding(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    } else {
      setOffboarding(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    }
  };

  return (
    <div className="space-y-6">
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('onboarding.taskDetails')}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('onboarding.task')}</label>
                <p className="text-primary">{selectedTask.title}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('onboarding.responsible')}</label>
                <p className="text-primary">{selectedTask.assignee}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('employees.col.status')}</label>
                <p className="text-primary">
                  {((selectedTask.type === 'onboarding' ? onboarding : offboarding).find(t => t.id === selectedTask.id)?.done) ? t('onboarding.done') : t('onboarding.inProgress')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('onboarding.comment')}</label>
                <textarea
                  className="w-full bg-app border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary resize-none h-24"
                  placeholder={t('onboarding.commentPh')}
                ></textarea>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => {
                    toggleTask(selectedTask.id, selectedTask.type as any);
                    setSelectedTask(null);
                  }}
                  className="w-full bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {((selectedTask.type === 'onboarding' ? onboarding : offboarding).find(task => task.id === selectedTask.id)?.done) ? t('onboarding.markUndone') : t('onboarding.markDone')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('onboarding.title')}</h2>
          <p className="text-muted mt-1">{t('onboarding.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('onboarding')}
          className={`flex-1 p-6 rounded-2xl border transition-colors flex items-center gap-4 ${activeTab === 'onboarding' ? 'bg-accent-500/10 border-accent-500/50' : 'bg-surface border-line hover:bg-surface-hover'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeTab === 'onboarding' ? 'bg-accent-500 text-white' : 'bg-surface-3 text-muted'}`}>
            <UserPlus className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className={`font-semibold text-lg ${activeTab === 'onboarding' ? 'text-accent-400' : 'text-primary'}`}>Onboarding</h3>
            <p className="text-sm text-muted">{t('onboarding.active', { count: 2 })}</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('offboarding')}
          className={`flex-1 p-6 rounded-2xl border transition-colors flex items-center gap-4 ${activeTab === 'offboarding' ? 'bg-accent-500/10 border-accent-500/50' : 'bg-surface border-line hover:bg-surface-hover'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeTab === 'offboarding' ? 'bg-accent-500 text-white' : 'bg-surface-3 text-muted'}`}>
            <UserMinus className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className={`font-semibold text-lg ${activeTab === 'offboarding' ? 'text-accent-400' : 'text-primary'}`}>Offboarding</h3>
            <p className="text-sm text-muted">{t('onboarding.active', { count: 1 })}</p>
          </div>
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-primary">
            {activeTab === 'onboarding' ? `${t('onboarding.newEmployee')}: Иванов Иван` : `${t('onboarding.leaving')}: Петров Петр`}
          </h3>
          {(() => {
            const currentTasks = activeTab === 'onboarding' ? onboarding : offboarding;
            const completed = currentTasks.filter(task => task.done).length;
            const progress = Math.round((completed / currentTasks.length) * 100);
            return <span className="text-sm text-muted">{t('onboarding.progress')}: {progress}%</span>;
          })()}
        </div>

        <div className="space-y-3">
          {(activeTab === 'onboarding' ? onboarding : offboarding).map(task => (
            <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl border border-line bg-surface-2 hover:bg-surface-hover transition-colors">
              <button onClick={() => toggleTask(task.id, activeTab as 'onboarding' | 'offboarding')} className={`${task.done ? 'text-accent-500' : 'text-muted hover:text-accent-400'} transition-colors`}>
                {task.done ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
              </button>
              <div className="flex-1">
                <p className={`font-medium ${task.done ? 'text-muted line-through' : 'text-primary'}`}>{task.title}</p>
                <p className="text-xs text-muted mt-1">{t('onboarding.responsible')}: {task.assignee}</p>
              </div>
              <button onClick={() => setSelectedTask({ ...task, type: activeTab })} className="p-2 text-muted hover:text-primary transition-colors cursor-pointer">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
