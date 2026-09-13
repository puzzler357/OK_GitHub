import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, TrendingUp, Users, Star, Award, X } from 'lucide-react';
import { useState } from 'react';

export default function Performance() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState([
    { id: 1, title: 'Увеличить конверсию лендинга на 15%', progress: 75, status: 'on-track' },
    { id: 2, title: 'Провести 10 code review', progress: 100, status: 'completed' },
    { id: 3, title: 'Изучить React Native', progress: 30, status: 'at-risk' },
  ]);

  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', progress: 0, status: 'on-track' });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLaunchReviewModalOpen, setIsLaunchReviewModalOpen] = useState(false);
  
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title) return;
    setGoals([...goals, { id: Date.now(), ...newGoal }]);
    setNewGoal({ title: '', progress: 0, status: 'on-track' });
    setIsAddGoalModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {isAddGoalModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('performance.addGoal')}</h3>
              <button onClick={() => setIsAddGoalModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="p-6 space-y-4">
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
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('performance.launchTitle')}</h3>
              <button onClick={() => setIsLaunchReviewModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.reviewPeriod')}</label>
                <select className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary">
                  <option value="q3">Q3 2024</option>
                  <option value="q2">Q2 2024</option>
                  <option value="q1">Q1 2024</option>
                  <option value="year">{t('performance.yearReview')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.participants')}</label>
                <div className="space-y-2 bg-app border border-line rounded-xl p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox bg-surface-3 border-strong rounded text-accent-500" defaultChecked />
                    <span className="text-sm text-secondary">{t('performance.wholeCompany')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox bg-surface-3 border-strong rounded text-accent-500" />
                    <span className="text-sm text-secondary">IT Отдел</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox bg-surface-3 border-strong rounded text-accent-500" />
                    <span className="text-sm text-secondary">HR Отдел</span>
                  </label>
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
                    alert(t('performance.launched'));
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
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-line">
              <h3 className="text-xl font-bold text-primary">{t('performance.reviewTitle')}</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.colleague')}: Петров Петр</label>
                <p className="text-xs text-muted mb-4">{t('performance.reviewHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('performance.overallScore')}</label>
                <select className="w-full bg-app border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary">
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
                  className="w-full bg-app border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 text-primary resize-none h-24"
                  placeholder={t('performance.reviewPh')}
                ></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 bg-surface-3 hover:bg-surface-hover text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    alert(t('performance.reviewSaved'));
                    setIsReviewModalOpen(false);
                  }}
                  className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('performance.submitReview')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('performance.title')}</h2>
          <p className="text-muted mt-1">{t('performance.subtitle')}</p>
        </div>
        <button onClick={() => setIsLaunchReviewModalOpen(true)} className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
          {t('performance.launchReview')}
        </button>
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
              {goals.map(goal => (
                <div key={goal.id} className="bg-surface-3 rounded-xl p-4 border border-line">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-primary">{goal.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-md ${
                      goal.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      goal.status === 'on-track' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {goal.status === 'completed' ? t('performance.gCompleted') : goal.status === 'on-track' ? t('performance.gOnTrack') : t('performance.gRisk')}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>{t('performance.progress')}</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-surface-4 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${goal.progress === 100 ? 'bg-emerald-500' : 'bg-accent-500'}`} 
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="text-lg font-medium text-primary flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              {t('performance.review360Pending')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl border border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-4 flex items-center justify-center font-medium text-secondary">ПП</div>
                  <div>
                    <p className="font-medium text-primary">Петров Петр</p>
                    <p className="text-xs text-muted">Peer Review</p>
                  </div>
                </div>
                <button onClick={() => setIsReviewModalOpen(true)} className="bg-surface-4 hover:bg-surface-hover px-3 py-1.5 rounded-lg text-sm text-primary transition-colors">
                  {t('performance.fill')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="text-lg font-medium text-primary flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              {t('performance.devHistory')}
            </h3>
            <div className="relative pl-4 border-l-2 border-line space-y-6">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-[var(--surface)]"></div>
                <p className="text-sm font-medium text-primary">Q2 2024: Exceeds Expectations</p>
                <p className="text-xs text-muted mt-1">Повышение до Senior Developer</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-[var(--surface)]"></div>
                <p className="text-sm font-medium text-primary">Q1 2024: Meets Expectations</p>
                <p className="text-xs text-muted mt-1">Успешно закрыт испытательный срок</p>
              </div>
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
