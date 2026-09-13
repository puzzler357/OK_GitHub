import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Square, UserPlus, UserMinus, ArrowRight, X } from 'lucide-react';
import { useDatabaseStore, TABLES } from '../store/useDatabaseStore';
import type { ChecklistTask } from '../store/useDatabaseStore';

type Kind = 'onboarding' | 'offboarding';

export default function Onboarding() {
  const { t } = useTranslation();
  const { checklistTasks, employees, updateIn } = useDatabaseStore();

  const [activeTab, setActiveTab] = useState<Kind>('onboarding');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const tasksOfKind = useMemo(
    () => checklistTasks.filter(task => task.kind === activeTab),
    [checklistTasks, activeTab],
  );

  // Сотрудники, у которых есть чек-лист этого типа. Счётчики на вкладках
  // считаются отсюда же — раньше там стояли константы 2 и 1.
  const employeeIds = useMemo(
    () => Array.from(new Set(tasksOfKind.map(task => task.employeeId))),
    [tasksOfKind],
  );

  const countActive = (kind: Kind) => {
    const tasks = checklistTasks.filter(task => task.kind === kind && !task.done);
    return new Set(tasks.map(task => task.employeeId)).size;
  };

  // При смене вкладки выбранный сотрудник может исчезнуть из списка. Раньше
  // это чинил эффект с setState — лишний проход рендера; теперь значение
  // просто выводится из данных.
  const currentEmployeeId = employeeIds.includes(selectedEmployeeId)
    ? selectedEmployeeId
    : employeeIds[0] ?? '';

  const tasks = tasksOfKind.filter(task => task.employeeId === currentEmployeeId);
  const selectedTask = selectedTaskId ? tasks.find(task => task.id === selectedTaskId) ?? null : null;

  const employeeName = (id: string) => employees.find(e => e.id === id)?.fullName ?? '—';

  const completed = tasks.filter(task => task.done).length;
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const toggleTask = (task: ChecklistTask) => {
    void updateIn(TABLES.checklistTasks, task.id, { done: !task.done });
  };

  const openTask = (task: ChecklistTask) => {
    setSelectedTaskId(task.id);
    setCommentDraft(task.comment ?? '');
  };

  const saveComment = () => {
    if (!selectedTask) return;
    void updateIn(TABLES.checklistTasks, selectedTask.id, { comment: commentDraft });
    setSelectedTaskId(null);
  };

  return (
    <div className="space-y-6">
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('onboarding.taskDetails')}</h3>
              <button onClick={() => setSelectedTaskId(null)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('onboarding.task')}</label>
                <p className="text-primary">{selectedTask.title}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('onboarding.responsible')}</label>
                <p className="text-primary">{selectedTask.assignee || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('employees.col.status')}</label>
                <p className="text-primary">{selectedTask.done ? t('onboarding.done') : t('onboarding.inProgress')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('onboarding.comment')}</label>
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="w-full bg-app border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary resize-none h-24"
                  placeholder={t('onboarding.commentPh')}
                />
              </div>
              <div className="pt-2 space-y-3">
                <button
                  onClick={saveComment}
                  className="w-full bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('onboarding.saveComment')}
                </button>
                <button
                  onClick={() => { toggleTask(selectedTask); setSelectedTaskId(null); }}
                  className="w-full bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {selectedTask.done ? t('onboarding.markUndone') : t('onboarding.markDone')}
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
            <p className="text-sm text-muted">{t('onboarding.active', { count: countActive('onboarding') })}</p>
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
            <p className="text-sm text-muted">{t('onboarding.active', { count: countActive('offboarding') })}</p>
          </div>
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {activeTab === 'onboarding' ? t('onboarding.newEmployee') : t('onboarding.leaving')}:
            </span>
            <select
              value={currentEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-app border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
            >
              {employeeIds.length === 0 && <option value="">—</option>}
              {employeeIds.map(id => (
                <option key={id} value={id}>{employeeName(id)}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-muted">{t('onboarding.progress')}: {progress}%</span>
        </div>

        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl border border-line bg-surface-2 hover:bg-surface-hover transition-colors">
              <button onClick={() => toggleTask(task)} className={`${task.done ? 'text-accent-500' : 'text-muted hover:text-accent-400'} transition-colors`}>
                {task.done ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
              </button>
              <div className="flex-1">
                <p className={`font-medium ${task.done ? 'text-muted line-through' : 'text-primary'}`}>{task.title}</p>
                <p className="text-xs text-muted mt-1">{t('onboarding.responsible')}: {task.assignee || '—'}</p>
              </div>
              <button onClick={() => openTask(task)} className="p-2 text-muted hover:text-primary transition-colors cursor-pointer">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="p-8 text-center text-muted border border-dashed border-line rounded-xl">
              {t('onboarding.noTasks')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
