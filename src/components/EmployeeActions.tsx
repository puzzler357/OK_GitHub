import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Edit, Trash, FileText, Printer, X } from 'lucide-react';
import { useDatabaseStore, Employee, Template } from '../store/useDatabaseStore';
import EmployeeForm from './EmployeeForm';

export default function EmployeeActions({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { deleteEmployee, updateEmployee, templates } = useDatabaseStore();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleDelete = () => {
    if (window.confirm(t('employees.actions.deleteConfirm', { name: employee.fullName }))) {
      deleteEmployee(employee.id);
    }
    setIsOpen(false);
  };

  const openDocModal = () => {
    setIsDocModalOpen(true);
    setIsOpen(false);
  };

  const handleEdit = (data: Omit<Employee, 'id'>) => {
    updateEmployee(employee.id, data);
    setIsEditOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleDropdown}
        className="p-1 rounded hover:bg-surface-hover dark:hover:bg-slate-800 text-muted transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-xl shadow-lg z-20 py-1 overflow-hidden">
            <button 
              className="w-full text-left px-4 py-2 text-sm text-secondary dark:text-slate-300 hover:bg-surface-hover dark:hover:bg-slate-800 flex items-center gap-2"
              onClick={() => { setIsEditOpen(true); setIsOpen(false); }}
            >
              <Edit className="w-4 h-4" />
              {t('employees.form.editTitle')}
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-secondary dark:text-slate-300 hover:bg-surface-hover dark:hover:bg-slate-800 flex items-center gap-2"
              onClick={openDocModal}
            >
              <FileText className="w-4 h-4" />
              {t('employees.actions.genDoc')}
            </button>
            <div className="border-t border-[var(--border-color)] my-1"></div>
            <button
              className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
              onClick={handleDelete}
            >
              <Trash className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </div>
        </>
      )}

      {isDocModalOpen && (
        <DocModal 
          employee={employee} 
          templates={templates} 
          onClose={() => setIsDocModalOpen(false)} 
        />
      )}

      {isEditOpen && (
        <EmployeeForm 
          initialData={employee}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}

function DocModal({ employee, templates, onClose }: { employee: Employee, templates: Template[], onClose: () => void }) {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');

  const template = templates.find(t => t.id === selectedTemplateId);

  const processTemplate = (content: string) => {
    let processed = content;
    processed = processed.replace(/\{\{fullName\}\}/g, employee.fullName);
    processed = processed.replace(/\{\{position\}\}/g, employee.position);
    processed = processed.replace(/\{\{department\}\}/g, employee.department);
    processed = processed.replace(/\{\{hireDate\}\}/g, new Date(employee.hireDate).toLocaleDateString());
    return processed;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    let htmlContent = `
      <html>
        <head>
          <title>${t('employees.doc.printTitle')}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; padding: 40px; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
            p { margin-bottom: 15px; font-size: 14pt; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
    `;
    
    template?.blocks.forEach(block => {
      htmlContent += `<p>${processTemplate(block.content)}</p>`;
    });
    
    htmlContent += `
          <div class="signature">
            <span>${t('employees.doc.signatureHead')}</span>
            <span>_________________</span>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-semibold">{t('employees.doc.title')}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <label className="block text-sm font-medium mb-2">{t('employees.doc.selectTemplate')}</label>
          <select 
            value={selectedTemplateId} 
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 mb-6"
          >
            {templates.length === 0 && <option value="" disabled>{t('employees.doc.noTemplates')}</option>}
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {template && (
            <div className="border border-[var(--border-color)] rounded-xl p-6 bg-surface-2 dark:bg-slate-950 font-serif text-primary dark:text-slate-200">
              {template.blocks.map(block => (
                <p key={block.id} className="mb-4">
                  {processTemplate(block.content)}
                </p>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-3 bg-surface-2 dark:bg-slate-900/50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors border border-transparent">
            {t('common.cancel')}
          </button>
          <button
            disabled={!template}
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {t('employees.doc.print')}
          </button>
        </div>
      </div>
    </div>
  );
}
