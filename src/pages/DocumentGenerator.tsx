import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useMoney } from '../lib/money';
import { FileText, Download, Printer, User } from 'lucide-react';
import { generateDocx } from '../lib/docx';
import { useAppStore } from '../store/useAppStore';

export default function DocumentGenerator() {
  const { t } = useTranslation();
  const { templates, employees } = useDatabaseStore();
  const money = useMoney();
  const docxTemplatePath = useAppStore((s) => s.docxTemplatePath);
  const orgName = useAppStore((s) => s.orgName);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const template = templates.find(t => t.id === selectedTemplate);
  const employee = employees.find(e => e.id === selectedEmployee);

  const handlePrint = () => {
    window.print();
  };

  /** Подстановка переменной: сначала введённое вручную, потом карточка сотрудника. */
  const resolveVar = (name: string): string => {
    if (variables[name] !== undefined && variables[name] !== '') return variables[name];
    if (!employee) return '';
    if (name === 'fullName' || name === 'ФИО') return employee.fullName;
    if (name === 'position' || name === 'Должность') return employee.position;
    if (name === 'department' || name === 'Отдел') return employee.department;
    if (name === 'salary' || name === 'Оклад') return money.format(employee.salary ?? 0);
    return '';
  };

  // Текст документа без разметки — то же, что видно в предпросмотре.
  const plainParagraphs = (): { text: string }[] => {
    if (!template) return [];
    return template.blocks
      .filter(block => block.type !== 'signature' && block.type !== 'table')
      .map(block => ({
        text: (block.content || '').replace(/\{\{(.*?)\}\}/g, (_m, name) => resolveVar(name.trim())),
      }))
      .filter(p => p.text.trim() !== '');
  };

  const handleDownloadDocx = async () => {
    if (!template) return;
    try {
      await generateDocx(docxTemplatePath, {
        orgName,
        title: template.name,
        date: new Date().toLocaleDateString(),
        paragraphs: plainParagraphs(),
      }, `${template.name}.docx`);
    } catch {
      // generateDocx уже пишет причину в консоль; пользователю нужен факт.
      alert(t('docgen.docxHint'));
    }
  };

  const renderContent = () => {
    if (!template) return null;
    let contentHtml = '';
    template.blocks.forEach(block => {
      if (block.type === 'signature') {
        contentHtml += `<div style="display: flex; justify-content: space-between; margin-top: 4rem; margin-bottom: 2rem;">
          <div style="width: 30%; border-top: 1px solid black; padding-top: 0.5rem; text-align: center; font-size: 0.875rem;">${t('builder.employeeSignature')}</div>
          <div style="width: 30%; border-top: 1px solid black; padding-top: 0.5rem; text-align: center; font-size: 0.875rem;">${t('builder.headSignature')}</div>
        </div>`;
        return;
      }
      
      if (block.type === 'table') {
        contentHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <thead>
            <tr>
              <th style="border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; background-color: #f8fafc;">${t('docgen.tableIndicator')}</th>
              <th style="border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; background-color: #f8fafc;">${t('docgen.tableValue')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 0.75rem;">${t('docgen.baseSalary')}</td>
              <td style="border: 1px solid #e2e8f0; padding: 0.75rem;">${variables['salary'] || (employee?.salary != null ? money.format(employee.salary) : '...')}</td>
            </tr>
          </tbody>
        </table>`;
        return;
      }

      let text = block.content || '';

      // Try replacing the real variables:
      const matches = text.match(/\{\{.*?\}\}/g);
      if (matches) {
        matches.forEach(m => {
          const varName = m.replace(/\{\{|\}\}/g, '');
          if (variables[varName] !== undefined && variables[varName] !== '') {
             text = text.replace(m, variables[varName]);
          } else if (employee) {
             if (varName === 'fullName' || varName === 'ФИО') text = text.replace(m, employee.fullName);
             if (varName === 'position' || varName === 'Должность') text = text.replace(m, employee.position);
             if (varName === 'department' || varName === 'Отдел') text = text.replace(m, employee.department);
             if (varName === 'salary' || varName === 'Оклад') text = text.replace(m, money.format(employee.salary ?? 0));
          }
        });
      }

      contentHtml += `<p style="margin-bottom: 1rem; text-align: left">${text}</p>`;
    });

    return <div dangerouslySetInnerHTML={{ __html: contentHtml }} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('docgen.title')}</h2>
          <p className="text-muted mt-1">{t('docgen.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadDocx}
            disabled={!template}
            className="bg-surface-3 border border-line hover:bg-surface-hover disabled:opacity-50 text-secondary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('docgen.downloadDocx')}
          </button>
          <button
            onClick={handlePrint}
            disabled={!template}
            className="bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t('docgen.printPdf')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6 no-print">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="font-medium text-primary mb-4">{t('docgen.docSettings')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">{t('docgen.template')}</label>
                <select
                  className="w-full bg-app border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                >
                  <option value="">{t('docgen.chooseTemplate')}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-1">{t('docgen.employeeOptional')}</label>
                <select
                  className="w-full bg-app border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                >
                  <option value="">{t('docgen.noEmployee')}</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} - {e.position}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {template && (
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h3 className="font-medium text-primary mb-4">{t('templates.variables')}</h3>
              <p className="text-xs text-muted mb-4">{t('docgen.fillFields')}</p>
              
              <div className="space-y-3">
                {/* Dynamically extract variables from blocks: {{VarName}} */}
                {Array.from(new Set(
                  template.blocks.flatMap(b => {
                    const matches = b.content?.match(/\{\{(.*?)\}\}/g);
                    return matches ? matches.map(m => m.replace(/\{\{|\}\}/g, '')) : [];
                  })
                )).filter(v => !['ФИО', 'Должность', 'Отдел', 'fullName', 'position', 'department'].includes(v)).map(v => (
                  <div key={v}>
                    <label className="block text-xs font-medium text-muted mb-1">{v}</label>
                    <input 
                      type="text"
                      className="w-full bg-app border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                      value={variables[v] || ''}
                      onChange={e => setVariables({...variables, [v]: e.target.value})}
                      placeholder={t('docgen.enterVar', { v: v.toLowerCase() })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {template ? (
            <div id="document-content" className="bg-white text-black p-12 min-h-[842px] shadow-lg rounded-sm print-container print-only">
              <h1 className="text-2xl font-bold mb-8 text-center">{template.name}</h1>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderContent()}
              </div>
            </div>
          ) : (
            <div className="bg-surface-2 border-2 border-dashed border-line rounded-2xl p-12 flex flex-col items-center justify-center text-center h-[500px] no-print">
              <div className="w-16 h-16 bg-surface-3 rounded-2xl flex items-center justify-center mb-4 text-muted">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-secondary">{t('employees.doc.selectTemplate')}</h3>
              <p className="text-muted text-sm mt-2 max-w-sm">
                {t('docgen.emptyDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
