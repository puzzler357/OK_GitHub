import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingDown, ClipboardList, BarChart as BarChartIcon, Download, FileText } from 'lucide-react';
import { useDatabaseStore } from '../store/useDatabaseStore';

export default function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('catalog');
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const { employees } = useDatabaseStore();

  const reports = [
    { id: 1, icon: Users, title: t('reports.items.headcountTitle'), desc: t('reports.items.headcountDesc') },
    { id: 2, icon: TrendingDown, title: t('reports.items.turnoverTitle'), desc: t('reports.items.turnoverDesc') },
    { id: 3, icon: ClipboardList, title: t('reports.items.timesheetTitle'), desc: t('reports.items.timesheetDesc') },
    { id: 4, icon: BarChartIcon, title: t('reports.items.movementsTitle'), desc: t('reports.items.movementsDesc') },
    { id: 5, icon: Users, title: t('reports.items.staffingTitle'), desc: t('reports.items.staffingDesc') },
  ];

  
  const renderReportContent = () => {
    if (!selectedReport) {
      return (
        <div className="flex-1 rounded-2xl border border-dashed border-line bg-surface-2 flex items-center justify-center">
          <p className="text-muted text-sm">{t('reports.selectReport')}</p>
        </div>
      );
    }

    const report = reports.find(r => r.id === selectedReport);
    
    return (
      <div className="flex-1 rounded-2xl border border-line bg-surface flex flex-col overflow-hidden">
        <div className="p-6 border-b border-line flex justify-between items-center bg-surface-2">
          <div>
            <h3 className="font-semibold text-lg text-primary">{report?.title}</h3>
            <p className="text-sm text-muted">{report?.desc}</p>
          </div>
          <button className="flex items-center gap-2 bg-surface-3 hover:bg-surface-hover border border-strong px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> {t('reports.downloadExcel')}
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {selectedReport === 1 && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted uppercase bg-surface-3">
                <tr>
                  <th className="p-table text-table rounded-tl-xl">{t('employees.col.fullName')}</th>
                  <th className="p-table text-table">{t('employees.col.position')}</th>
                  <th className="p-table text-table">{t('employees.col.department')}</th>
                  <th className="p-table text-table">{t('employees.form.hireDate')}</th>
                  <th className="p-table text-table rounded-tr-xl">{t('employees.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b border-line hover:bg-surface-hover">
                    <td className="p-table text-table font-medium text-primary">{emp.fullName}</td>
                    <td className="p-table text-table text-muted">{emp.position}</td>
                    <td className="p-table text-table text-muted">{emp.department}</td>
                    <td className="p-table text-table text-muted">{emp.hireDate}</td>
                    <td className="p-table text-table">
                      <span className={`px-2 py-1 rounded-md text-xs ${emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : emp.status === 'probation' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {emp.status === 'active' ? t('employees.status.active') : emp.status === 'probation' ? t('employees.status.probation') : t('employees.status.onLeave')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-3 border border-line p-4 rounded-xl">
                  <p className="text-sm text-muted">{t('reports.turnoverAvg')}</p>
                  <p className="text-2xl font-bold text-primary mt-1">4.2%</p>
                </div>
                <div className="bg-surface-3 border border-line p-4 rounded-xl">
                  <p className="text-sm text-muted">{t('reports.dismissed')}</p>
                  <p className="text-2xl font-bold text-primary mt-1">12</p>
                </div>
                <div className="bg-surface-3 border border-line p-4 rounded-xl">
                  <p className="text-sm text-muted">{t('reports.hired')}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{employees.length}</p>
                </div>
              </div>
              <div className="h-64 border border-dashed border-line rounded-xl flex items-center justify-center text-muted">
                <BarChartIcon className="w-8 h-8 mr-3 opacity-50" /> {t('reports.turnoverChart')}
              </div>
            </div>
          )}

          {selectedReport === 3 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-xs text-muted uppercase bg-surface-3">
                  <tr>
                    <th className="px-4 py-2 whitespace-nowrap sticky left-0 bg-surface-3 z-10">{t('timeoff.colEmployee')}</th>
                    {Array.from({length: 15}).map((_, i) => (
                      <th key={i} className="px-2 py-2 text-center">{i + 1}</th>
                    ))}
                    <th className="px-4 py-2 whitespace-nowrap">{t('reports.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-line hover:bg-surface-hover">
                      <td className="px-4 py-2 font-medium text-primary sticky left-0 bg-surface whitespace-nowrap z-10">{emp.fullName}</td>
                      {Array.from({length: 15}).map((_, i) => {
                        const isWeekend = i === 5 || i === 6 || i === 12 || i === 13;
                        const isLeave = emp.status === 'on_leave';
                        const code = isWeekend ? 'В' : isLeave ? 'ОТ' : 'Я';
                        return (
                          <td key={i} className={`px-2 py-2 text-center border-l border-subtle ${isWeekend ? 'bg-surface-2 text-rose-400' : 'text-secondary'}`}>
                            {code}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2 font-bold border-l border-subtle text-accent-400">
                        {emp.status === 'on_leave' ? 0 : 88} {t('archive.hoursShort')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 4 && (
            <div className="space-y-4">
              {employees.slice(0, 5).map(emp => (
                <div key={emp.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-2 border border-line">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    П
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-primary">{t('reports.hireEvent')}</p>
                    <p className="text-sm text-muted">{emp.fullName} ({emp.position})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-secondary">{emp.hireDate}</p>
                    <p className="text-xs text-muted">{t('reports.order', { n: Math.floor(Math.random() * 100) + 10 })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedReport === 5 && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted uppercase bg-surface-3">
                <tr>
                  <th className="p-table text-table rounded-tl-xl">{t('reports.deptPosition')}</th>
                  <th className="p-table text-table text-center">{t('orgchart.staffUnits')}</th>
                  <th className="p-table text-table text-center">{t('orgchart.occupied')}</th>
                  <th className="p-table text-table text-center">{t('orgchart.vacant')}</th>
                  <th className="p-table text-table rounded-tr-xl">{t('reports.salaryLabor')}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(employees.map(e => e.department))).map(dept => {
                  const deptEmps = employees.filter(e => e.department === dept);
                  return (
                    <React.Fragment key={dept}>
                      <tr className="bg-surface-3 border-y border-line">
                        <td colSpan={5} className="px-4 py-2 font-bold text-accent-400 uppercase text-xs">{dept}</td>
                      </tr>
                      {Array.from(new Set(deptEmps.map(e => e.position))).map(pos => {
                        const count = deptEmps.filter(e => e.position === pos).length;
                        return (
                          <tr key={pos} className="border-b border-line hover:bg-surface-hover">
                            <td className="p-table text-table pl-8 font-medium text-primary">{pos}</td>
                            <td className="p-table text-table text-center text-muted">{count + 1}</td>
                            <td className="p-table text-table text-center text-muted">{count}</td>
                            <td className="p-table text-table text-center text-emerald-400">1</td>
                            <td className="p-table text-table text-muted">{t('reports.perStaffing')}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <h2 className="text-2xl font-semibold tracking-tight">{t('nav.reports')}</h2>

      <div className="flex gap-1">
        <button
          onClick={() => { setActiveTab('catalog'); setSelectedReport(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'catalog' ? 'bg-surface-3 text-primary' : 'text-muted hover:bg-surface-hover'}`}
        >
          {t('reports.catalog')}
        </button>
        <button
          onClick={() => setActiveTab('constructor')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'constructor' ? 'bg-surface-3 text-primary' : 'text-muted hover:bg-surface-hover'}`}
        >
          {t('reports.constructorBeta')}
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="font-semibold text-lg mb-2">{t('reports.catalog')}</h3>
          {reports.map(report => (
            <button key={report.id} onClick={() => setSelectedReport(report.id)} className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors text-left group ${selectedReport === report.id ? 'bg-surface-3 border-accent-500' : 'bg-surface-3 border-line hover:bg-surface-hover'}`}>
              <div className="w-12 h-12 rounded-xl bg-surface-4 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-600/20 transition-colors">
                <report.icon className="w-6 h-6 text-muted group-hover:text-accent-400" />
              </div>
              <div>
                <h4 className="font-medium text-primary">{report.title}</h4>
                <p className="text-sm text-muted mt-1">{report.desc}</p>
              </div>
            </button>
          ))}
        </div>
        
        {activeTab === 'catalog' ? renderReportContent() : (
          <div className="flex-1 rounded-2xl border border-dashed border-line bg-surface-2 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-surface-3 rounded-2xl flex items-center justify-center mb-4 text-muted">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-secondary">{t('reports.constructorTitle')}</h3>
            <p className="text-muted text-sm mt-2 max-w-sm">
              {t('reports.constructorDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
