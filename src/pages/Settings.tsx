import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useDatabaseStore } from '../store/useDatabaseStore';
import * as api from '../data';
import { Settings as SettingsIcon, ShieldCheck, Key, Shield, Database, Link, Palette, Eye, Download, RefreshCw, Check, Sun, Moon, Monitor } from 'lucide-react';

export default function Settings() {
  const [resetPassword, setResetPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { t } = useTranslation();
  const { theme, language, setTheme, setLanguage, accentColor, setAccentColor, density, setDensity, fontSize, setFontSize, user } = useAppStore();
  const [activeTab, setActiveTab] = useState('general');

  
  const mockAudit = [
    { id: 1, date: '2023-10-25 14:32', user: 'admin', action: 'Изменение настроек', entity: 'Система', diff: 'theme: light -> dark' },
    { id: 2, date: '2023-10-25 12:15', user: 'hr_manager', action: 'Добавление сотрудника', entity: 'Сотрудники', diff: '+ id: 1042' },
    { id: 3, date: '2023-10-24 09:00', user: 'admin', action: 'Вход в систему', entity: 'Авторизация', diff: 'Успешно' },
  ];

  const mockBackups = [
    { id: 1, file: 'backup_20231025_0300.sql.gz', size: '145 MB', created: '25.10.2023 03:00' },
    { id: 2, file: 'backup_20231024_0300.sql.gz', size: '144 MB', created: '24.10.2023 03:00' },
    { id: 3, file: 'backup_20231023_0300.sql.gz', size: '142 MB', created: '23.10.2023 03:00' },
  ];

  const tabs = [
    { id: 'general', icon: SettingsIcon, label: t('settings.tabs.general') },
    { id: 'license', icon: ShieldCheck, label: t('settings.tabs.license') },
    { id: 'passwords', icon: Key, label: t('settings.tabs.password') },
    { id: 'security', icon: Shield, label: t('settings.tabs.security') },
    { id: 'backup', icon: Database, label: t('settings.tabs.backup') },
    { id: 'integrations', icon: Link, label: t('settings.tabs.io') },
    { id: 'appearance', icon: Palette, label: t('settings.tabs.appearance') },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h2>

      <div className="flex flex-1 min-h-0 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
        
        {/* Left Sidebar for Settings Tabs */}
        <div className="w-64 border-r border-[var(--border-color)] p-4 flex flex-col gap-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-accent-600/10 text-accent-400 font-medium' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-medium mb-8 border-b border-[var(--border-color)] pb-4">{t('settings.general.title')}</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.general.orgName')}</label>
                  <input type="text" className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.general.inn')}</label>
                  <input type="text" className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.general.director')}</label>
                  <input type="text" className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.language')}</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="tk">Türkmençe</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'license' && (
            <div className="text-muted text-sm">
              {t('settings.license.loading')}
            </div>
          )}

          {activeTab === 'passwords' && (
            <div className="max-w-3xl space-y-8">
              <div className="bg-surface-2 border border-line rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-5 h-5 text-accent-400" />
                  <h3 className="text-lg font-medium">{t('settings.password.title')}</h3>
                </div>
                <p className="text-sm text-muted mb-6">{t('settings.password.hint')}</p>

                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.password.current')}</label>
                    <div className="relative">
                      <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder={t('settings.password.currentPlaceholder')} className="w-full bg-input border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.password.new')}</label>
                    <div className="relative">
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('settings.password.minChars')} className="w-full bg-input border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-secondary">{t('settings.password.confirm')}</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('settings.password.confirmPlaceholder')} className="w-full bg-input border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
                  </div>
                  <button onClick={async () => {
                    if (newPassword !== confirmPassword) {
                      alert(t('settings.password.mismatch'));
                      return;
                    }
                    if (newPassword.length < 6) {
                      alert(t('settings.password.tooShort'));
                      return;
                    }
                    try {
                      await api.changePassword(user?.email || '', currentPassword, newPassword);
                      alert(t('settings.password.success'));
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    } catch (e) {
                      alert(e instanceof Error ? e.message : t('settings.password.error'));
                    }
                  }} className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors mt-2 text-sm">
                    {t('settings.password.save')}
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 max-w-5xl">
              <div className="bg-surface-2 border border-line rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-medium">{t('settings.security.passwordless')}</h3>
                </div>
                <p className="text-sm text-muted mb-6">{t('settings.security.passwordlessHint')}</p>
                <div className="flex items-center gap-3">
                  <button className="w-12 h-6 bg-surface-4 rounded-full relative transition-colors">
                    <span className="w-5 h-5 bg-surface-4 rounded-full absolute left-0.5 top-0.5"></span>
                  </button>
                  <span className="text-sm font-medium text-secondary">{t('settings.security.off')}</span>
                </div>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-rose-500" />
                  <h3 className="text-lg font-medium text-rose-500">{t('settings.security.resetTitle')}</h3>
                </div>
                <p className="text-sm text-muted mb-6">{t('settings.security.resetHint')}</p>
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-rose-400/80">{t('settings.security.adminPassword')}</label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder={t('settings.security.adminPasswordPlaceholder')}
                      className="w-full bg-input border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-primary"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(t('settings.security.resetConfirm'))) return;
                      try {
                        await api.resetSystem(resetPassword);
                        localStorage.removeItem('hr-docs-local-db');
                        localStorage.removeItem('hr-docs-app-storage');
                        alert(t('settings.security.resetSuccess'));
                        window.location.reload();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : t('settings.security.resetError'));
                      }
                    }}
                    className="bg-rose-500/20 text-rose-500 border border-rose-500/30 hover:bg-rose-500/30 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    {t('settings.security.resetBtn')}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{t('settings.audit.title')}</h3>
                    <p className="text-sm text-muted">{t('settings.audit.subtitle')}</p>
                  </div>
                  <button className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-medium">
                    <Download className="w-4 h-4" /> {t('common.export')}
                  </button>
                </div>

                <div className="bg-surface-2 border border-line rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-line flex items-end gap-4 bg-surface">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted mb-2">{t('settings.audit.actionType')}</label>
                      <select className="w-full bg-app border border-line rounded-xl px-4 py-2 text-sm focus:outline-none text-secondary appearance-none">
                        <option>{t('settings.audit.all')}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted mb-2">{t('settings.audit.entity')}</label>
                      <select className="w-full bg-app border border-line rounded-xl px-4 py-2 text-sm focus:outline-none text-secondary appearance-none">
                        <option>{t('settings.audit.all')}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted mb-2">{t('settings.audit.dateFrom')}</label>
                      <div className="relative">
                        <input type="text" placeholder={t('settings.audit.datePlaceholder')} className="w-full bg-app border border-line rounded-xl px-4 py-2 text-sm focus:outline-none text-secondary" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      </div>
                    </div>
                    <button className="bg-accent-500/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30 px-6 py-2 rounded-xl text-sm font-medium transition-colors h-[38px]">
                      {t('common.apply')}
                    </button>
                  </div>

                  <table className="w-full text-sm text-left">
                    <thead className="text-table text-secondary bg-surface border-b border-line">
                      <tr>
                        <th className="p-table text-table font-medium">{t('settings.audit.datetime')}</th>
                        <th className="p-table text-table font-medium">{t('settings.audit.user')}</th>
                        <th className="p-table text-table font-medium">{t('settings.audit.action')}</th>
                        <th className="p-table text-table font-medium">{t('settings.audit.entity')}</th>
                        <th className="p-table text-table font-medium">{t('settings.audit.diff')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockAudit.map(a => (
                        <tr key={a.id} className="border-b border-line hover:bg-surface-hover">
                          <td className="p-table text-table">{a.date}</td>
                          <td className="p-table text-accent-400">{a.user}</td>
                          <td className="p-table text-table">{a.action}</td>
                          <td className="p-table text-table">{a.entity}</td>
                          <td className="p-table font-mono text-xs">{a.diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="max-w-5xl space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-1">{t('settings.backup.title')}</h3>
                <p className="text-sm text-muted">{t('settings.backup.subtitle')}</p>
              </div>

              <div className="bg-surface-2 border border-line rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-accent-400" />
                    <h4 className="text-lg font-medium">{t('settings.backup.createFull')}</h4>
                  </div>
                  <p className="text-sm text-muted">{t('settings.backup.autoInfo')} <span className="bg-surface-3 px-1.5 py-0.5 rounded text-secondary text-xs">/app/backups</span></p>
                </div>
                <button className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm flex-shrink-0">
                  <span className="w-0 h-0 border-t-4 border-b-4 border-l-[6px] border-transparent border-l-white"></span> {t('settings.backup.createNow')}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-muted" />
                    <h4 className="text-lg font-medium">{t('settings.backup.available')}</h4>
                  </div>
                  <button className="text-muted hover:text-secondary transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-surface-2 border border-line rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-table text-secondary bg-surface border-b border-line">
                      <tr>
                        <th className="p-table text-table font-medium">{t('settings.backup.file')}</th>
                        <th className="p-table text-table font-medium">{t('settings.backup.size')}</th>
                        <th className="p-table text-table font-medium">{t('settings.backup.created')}</th>
                        <th className="p-table font-medium text-right">{t('settings.backup.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockBackups.map(b => (
                        <tr key={b.id} className="border-b border-line hover:bg-surface-hover">
                          <td className="p-table text-accent-400">{b.file}</td>
                          <td className="p-table text-table">{b.size}</td>
                          <td className="p-table text-table">{b.created}</td>
                          <td className="p-table text-right space-x-3">
                            <button className="text-accent-400 hover:text-accent-300">{t('settings.backup.download')}</button>
                            <button className="text-rose-400 hover:text-rose-300">{t('common.delete')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="max-w-5xl space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-1">{t('settings.io.title')}</h3>
                <p className="text-sm text-muted">{t('settings.io.subtitle')}</p>
              </div>

              <div>
                <div className="bg-surface-2 border border-line rounded-2xl p-6 md:p-8">
                  <h4 className="font-medium text-lg mb-6">{t('settings.io.wizard')}</h4>
                  <div className="flex gap-6 mb-8 border-b border-line overflow-x-auto">
                    <div className="pb-3 border-b-2 border-accent-500 text-accent-400 text-sm font-medium whitespace-nowrap">{t('settings.io.step1')}</div>
                    <div className="pb-3 text-muted text-sm font-medium whitespace-nowrap">{t('settings.io.step2')}</div>
                    <div className="pb-3 text-muted text-sm font-medium whitespace-nowrap">{t('settings.io.step3')}</div>
                    <div className="pb-3 text-muted text-sm font-medium whitespace-nowrap">{t('settings.io.step4')}</div>
                  </div>

                  <div className="border-2 border-dashed border-line rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-input">
                    <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mb-4">
                      <Download className="w-6 h-6 text-muted" />
                    </div>
                    <p className="text-secondary font-medium mb-2">{t('settings.io.drop')}</p>
                    <p className="text-muted text-sm mb-6">{t('settings.io.formats')}</p>
                    <button className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                      {t('settings.io.choose')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-3xl space-y-8">
              <div>
                <h3 className="text-sm font-medium mb-4 text-primary">{t('settings.appearance.colorTheme')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(['light', 'dark', 'system'] as const).map((tOpt) => (
                    <button
                      key={tOpt}
                      onClick={() => setTheme(tOpt)}
                      className={`relative p-6 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-colors ${
                        theme === tOpt 
                          ? 'border-accent-500 bg-accent-500/10 text-accent-400' 
                          : 'border-line bg-surface-2 hover:bg-surface-hover text-muted'
                      }`}
                    >
                      {tOpt === 'light' ? <Sun className="w-6 h-6" /> : tOpt === 'dark' ? <Moon className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                      <span className="text-sm font-medium">{tOpt === 'light' ? t('settings.light') : tOpt === 'dark' ? t('settings.dark') : t('settings.system')}</span>
                      {theme === tOpt && <div className="absolute bottom-3"><Check className="w-4 h-4 text-accent-400" /></div>}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="border border-line rounded-2xl p-6 bg-surface-2">
                <h3 className="text-sm font-medium mb-1 text-primary">{t('settings.appearance.accent')}</h3>
                <p className="text-xs text-muted mb-6">{t('settings.appearance.accentHint')}</p>
                <div className="flex gap-4">
                  {(['indigo', 'purple', 'blue', 'emerald', 'rose', 'amber'] as const).map(color => {
                    const colorClasses = {
                      indigo: 'bg-indigo-500 ring-indigo-500',
                      purple: 'bg-purple-500 ring-purple-500',
                      blue: 'bg-blue-500 ring-blue-500',
                      emerald: 'bg-emerald-500 ring-emerald-500',
                      rose: 'bg-rose-500 ring-rose-500',
                      amber: 'bg-amber-500 ring-amber-500',
                    }[color];
                    
                    return (
                      <div 
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={`w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center text-white ${colorClasses} ${
                          accentColor === color ? 'ring-2 ring-offset-2 ring-offset-[var(--surface-2)]' : ''
                        }`}
                      >
                        {accentColor === color && <Check className="w-4 h-4" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-line rounded-2xl p-6 bg-surface-2">
                <h3 className="text-sm font-medium mb-1 text-primary">{t('settings.appearance.density')}</h3>
                <p className="text-xs text-muted mb-6">{t('settings.appearance.densityHint')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(['compact', 'standard', 'spacious'] as const).map(d => (
                    <div 
                      key={d}
                      onClick={() => setDensity(d)}
                      className={`rounded-xl p-4 cursor-pointer transition-colors ${
                        density === d 
                          ? 'border border-accent-500 bg-accent-500/10' 
                          : 'border border-line bg-input hover:bg-surface-hover'
                      }`}
                    >
                      <p className={`font-medium text-sm ${density === d ? 'text-accent-400' : 'text-primary'}`}>
                        {d === 'compact' ? t('settings.appearance.compact') : d === 'standard' ? t('settings.appearance.standard') : t('settings.appearance.spacious')}
                      </p>
                      <p className={`text-xs mt-1 ${density === d ? 'text-accent-400/70' : 'text-muted'}`}>
                        {d === 'compact' ? t('settings.appearance.compactHint') : d === 'standard' ? t('settings.appearance.standardHint') : t('settings.appearance.spaciousHint')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-line rounded-2xl p-6 bg-surface-2">
                <h3 className="text-sm font-medium mb-6 text-primary">{t('settings.appearance.fontSize')}</h3>
                <div className="flex items-center gap-4 px-2">
                  <span className="text-xs font-medium text-muted cursor-pointer" onClick={() => setFontSize('small')}>A</span>
                  <div className="flex-1 relative h-2 bg-surface-3 rounded-full flex items-center">
                    <div className="absolute top-0 left-0 h-full bg-accent-500 rounded-full transition-all" style={{ width: fontSize === 'small' ? '0%' : fontSize === 'standard' ? '50%' : '100%' }}></div>
                    
                    <div 
                      onClick={() => setFontSize('small')}
                      className={`absolute left-0 w-4 h-4 rounded-full cursor-pointer -translate-x-1/2 ${fontSize === 'small' ? 'bg-accent-400 ring-4 ring-accent-500/30 shadow-sm' : 'bg-transparent'}`}
                    ></div>
                    <div 
                      onClick={() => setFontSize('standard')}
                      className={`absolute left-1/2 w-4 h-4 rounded-full cursor-pointer -translate-x-1/2 ${fontSize === 'standard' ? 'bg-accent-400 ring-4 ring-accent-500/30 shadow-sm' : 'bg-transparent'}`}
                    ></div>
                    <div 
                      onClick={() => setFontSize('large')}
                      className={`absolute left-full w-4 h-4 rounded-full cursor-pointer -translate-x-1/2 ${fontSize === 'large' ? 'bg-accent-400 ring-4 ring-accent-500/30 shadow-sm' : 'bg-transparent'}`}
                    ></div>
                  </div>
                  <span className="text-lg font-medium text-muted cursor-pointer" onClick={() => setFontSize('large')}>A</span>
                </div>
                <div className="flex justify-between mt-3 px-2">
                  <span className="text-xs text-muted">{t('settings.appearance.small')}</span>
                  <span className="text-xs text-muted">{t('settings.appearance.standard')}</span>
                  <span className="text-xs text-muted">{t('settings.appearance.large')}</span>
                </div>
                <p className="text-sm text-muted mt-6 pt-4 border-t border-line">{t('settings.appearance.current')} <span className="text-primary font-medium">
                  {fontSize === 'small' ? t('settings.appearance.small14') : fontSize === 'standard' ? t('settings.appearance.standard16') : t('settings.appearance.large18')}
                </span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
