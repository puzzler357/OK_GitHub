import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, TrendingUp, Users, Award, X } from 'lucide-react';
import { useDatabaseStore, TABLES } from '../store/useDatabaseStore';
import type { Goal, Review } from '../store/useDatabaseStore';
import { useNotify } from '../components/Toasts';

/** Текущий период в том же формате, в каком он лежит в базе: 2026-Q3. */
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

export default function Performance() {
  const { t } = useTranslation();
  const { goals, reviews, employees, departments, createIn } = useDatabaseStore();
  const notify = useNotify();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLaunchReviewModalOpen, setIsLaunchReviewModalOpen] = useState(false);

  const [newGoal, setNewGoal] = useState({ title: '', progress: 0, status: 'on-track', period: currentPeriod() });
  const [newReview, setNewReview] = useState({ employeeId: '', score: '4', comment: '', period: currentPeriod() });

  // Значение выводится из данных, а не досинхронизируется эффектом:
  // setState внутри эффекта стоит лишнего прохода рендера.
  const currentEmployeeId = selectedEmployeeId || employees[0]?.id || '';

  const employeeName = (id: string) => employees.find(e => e.id === id)?.fullName ?? '—';

  const employeeGoals = useMemo(
    () => goals.filter(g => g.employeeId === currentEmployeeId),
    [goals, currentEmployeeId],
  );

  const employeeReviews = useMemo(
    () => reviews.filter(r => r.employeeId === currentEmployeeId),
    [reviews, currentEmployeeId],
  );

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title || !currentEmployeeId) return;

    await createIn<Goal>(TABLES.goals, {
      employeeId: currentEmployeeId,
      title: newGoal.title,
      progress: newGoal.progress,
      status: newGoal.status,
      period: newGoal.period,
    });

    setNewGoal({ title: '', progress: 0, status: 'on-track', period: currentPeriod() });
    setIsAddGoalModalOpen(false);
  };

  const handleSaveReview = async () => {
    if (!newReview.employeeId) return;

    await createIn<Review>(TABLES.reviews, {
      employeeId: newReview.employeeId,
      // Однопользовательское приложение: оценку ставит владелец устройства.
      reviewer: t('user.owner'),
      period: newReview.period,
      score: Number(newReview.score),
      comment: newReview.comment,
    });

    setNewReview({ employeeId: '', score: '4', comment: '', period: currentPeriod() });
    setIsReviewModalOpen(false);
  };

  const openReviewFor = (employeeId: string) => {
    setNewReview({ employeeId, score: '4', comment: '', period: currentPeriod() });
    setIsReviewModalOpen(true);
  };

  // Сотрудники без оценки за текущий период — именно их и нужно оценить.
  const pendingReviewEmployees = useMemo(() => {
    const period = currentPeriod();
    const reviewed = new Set(reviews.filter(r => r.period === period).map(r => r.employeeId));
    return employees.filter(e => !reviewed.has(e.id)).slice(0, 5);
  }, [employees, reviews]);

  const initials = (name: string) => name.split(' ').slice(0, 2).map(part => part[0]).join('');

  return (
    <div className="space-y-6">
      {isAddGoalModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('performance.addGoal')}</h3>
              <button onClick={() => setIsAddGoalModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.goalDesc')} *</label>
                <input
                  type="text"
                  required
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                  placeholder={t('performance.goalPh')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.progressPct')}</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={newGoal.progress}
                  onChange={(e) => setNewGoal({ ...newGoal, progress: parseInt(e.target.value) || 0 })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.period')}</label>
                <input
                  type="text"
                  value={newGoal.period}
                  onChange={(e) => setNewGoal({ ...newGoal, period: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('employees.col.status')}</label>
                <select
                  value={newGoal.status}
                  onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                >
                  <option value="on-track">{t('performance.statusOnTrack')}</option>
                  <option value="at-risk">{t('performance.statusAtRisk')}</option>
                  <option value="completed">{t('performance.statusCompleted')}</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddGoalModalOpen(false)}
                  className="flex-1 bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLaunchReviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('performance.launchReview')}</h3>
              <button onClick={() => setIsLaunchReviewModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.reviewPeriod')}</label>
                <input
                  type="text"
                  defaultValue={currentPeriod()}
                  readOnly
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.participants')}</label>
                {/* Подразделения берутся из справочника, а не из двух захардкоженных строк. */}
                <div className="space-y-2 bg-app border border-line rounded-xl p-3 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox bg-surface-3 border-strong rounded text-accent-500" defaultChecked />
                    <span className="text-sm text-secondary">{t('performance.wholeCompany')}</span>
                  </label>
                  {departments.map(dep => (
                    <label key={dep.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="form-checkbox bg-surface-3 border-strong rounded text-accent-500" />
                      <span className="text-sm text-secondary">{dep.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsLaunchReviewModalOpen(false)}
                  className="flex-1 bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    notify.success(t('performance.launched'));
                    setIsLaunchReviewModalOpen(false);
                  }}
                  className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('performance.launch')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('performance.reviewTitle')}</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('performance.colleague')}: {employeeName(newReview.employeeId)}
                </label>
                <p className="text-xs text-muted mb-4">{t('performance.reviewHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.overallScore')}</label>
                <select
                  value={newReview.score}
                  onChange={(e) => setNewReview({ ...newReview, score: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
                >
                  <option value="5">{t('performance.score5')}</option>
                  <option value="4">{t('performance.score4')}</option>
                  <option value="3">{t('performance.score3')}</option>
                  <option value="2">{t('performance.score2')}</option>
                  <option value="1">{t('performance.score1')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('onboarding.comment')}</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  className="w-full bg-app border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary resize-none h-24"
                  placeholder={t('performance.reviewPh')}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveReview}
                  className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('performance.submitReview')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('performance.title')}</h2>
          <p className="text-muted mt-1">{t('performance.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={currentEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="bg-surface border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary"
            aria-label={t('performance.employee')}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
          <button onClick={() => setIsLaunchReviewModalOpen(true)} className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
            {t('performance.launchReview')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-400" />
                {t('performance.currentGoals')}
              </h3>
              <button onClick={() => setIsAddGoalModalOpen(true)} className="text-sm text-accent-400 hover:text-accent-300">{t('performance.addGoalShort')}</button>
            </div>
            <div className="space-y-4">
              {employeeGoals.map(goal => (
                <div key={goal.id} className="bg-surface-3 rounded-xl p-4 border border-line">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <p className="font-medium text-primary">{goal.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${
                      goal.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      goal.status === 'on-track' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {goal.status === 'completed' ? t('performance.gCompleted') : goal.status === 'on-track' ? t('performance.gOnTrack') : t('performance.gRisk')}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{goal.period}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>{t('performance.progress')}</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-surface-4 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${goal.progress === 100 ? 'bg-emerald-500' : 'bg-accent-500'}`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {employeeGoals.length === 0 && (
                <div className="p-8 text-center text-muted border border-dashed border-line rounded-xl">
                  {t('performance.noGoals')}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="text-lg font-medium text-primary flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              {t('performance.review360Pending')}
            </h3>
            <div className="space-y-3">
              {pendingReviewEmployees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-4 bg-surface-3 rounded-xl border border-line">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-4 flex items-center justify-center font-medium text-secondary">
                      {initials(emp.fullName)}
                    </div>
                    <div>
                      <p className="font-medium text-primary">{emp.fullName}</p>
                      <p className="text-xs text-muted">{emp.position}</p>
                    </div>
                  </div>
                  <button onClick={() => openReviewFor(emp.id)} className="bg-surface-4 hover:bg-surface-hover px-3 py-1.5 rounded-lg text-sm text-primary transition-colors">
                    {t('performance.fill')}
                  </button>
                </div>
              ))}

              {pendingReviewEmployees.length === 0 && (
                <div className="p-8 text-center text-muted border border-dashed border-line rounded-xl">
                  {t('performance.noReviews')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="text-lg font-medium text-primary flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              {t('performance.devHistory')}
            </h3>
            {/* История строится из сохранённых оценок выбранного сотрудника,
                а не из двух подписанных вручную вех. */}
            <div className="relative pl-4 border-l-2 border-line space-y-6">
              {employeeReviews.map(review => (
                <div key={review.id} className="relative">
                  <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface)] ${review.score >= 4.5 ? 'bg-emerald-500' : review.score >= 3.5 ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <p className="text-sm font-medium text-primary">{review.period}: {review.score}</p>
                  {review.comment && <p className="text-xs text-muted mt-1">{review.comment}</p>}
                  <p className="text-xs text-muted mt-1">{review.reviewer}</p>
                </div>
              ))}

              {employeeReviews.length === 0 && (
                <p className="text-sm text-muted">{t('performance.noReviews')}</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-accent-900/40 to-surface border border-accent-500/20 rounded-2xl p-6 text-center">
            <Award className="w-12 h-12 text-accent-400 mx-auto mb-3" />
            <h4 className="font-medium text-primary">{t('performance.outstanding')}</h4>
            <p className="text-sm text-muted mt-2">{t('performance.outstandingDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
