import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Plus, Type, Table as TableIcon, FileSignature, LayoutTemplate, Printer, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useAppStore } from '../store/useAppStore';
import { clickable } from '../lib/a11y';
import { useNotify } from '../components/Toasts';

export default function TemplateBuilder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  
  const { templates, addTemplate, updateTemplate } = useDatabaseStore();
  const orgName = useAppStore((s) => s.orgName);
  const notify = useNotify();

  const [templateName, setTemplateName] = useState(t('builder.newTemplate'));
  // Стартовый контент нового шаблона. Содержит {{переменные}}, подставляемые
  // при генерации; название организации берётся из «Настройки → Общие», а не
  // из захардкоженного «ООО "Глобал Тек"».
  const [blocks, setBlocks] = useState([
    { id: '1', type: 'text', content: `Справка дана {{fullName}} в том, что он(а) действительно работает в ${orgName} в должности {{position}}.` },
  ]);

  // Подгрузка редактируемого шаблона. Делается при рендере, а не в эффекте:
  // setState в эффекте стоит лишнего прохода, а здесь React перерисует
  // компонент сразу с нужным состоянием. loadedId не даёт затереть правки
  // пользователя при каждом обновлении списка шаблонов.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (templateId && templateId !== loadedId) {
    const template = templates.find(item => item.id === templateId);
    if (template) {
      setTemplateName(template.name);
      setBlocks(template.blocks);
      setLoadedId(templateId);
    }
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };
  
  const addBlock = (type: string) => {
    // Идентификатор выводится из уже существующих: случайное число здесь
    // ничего не давало, кроме нечистого вызова в теле компонента.
    const nextId = String(blocks.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0) + 1);
    setBlocks([...blocks, { id: nextId, type, content: '' }]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (templateId) {
      updateTemplate(templateId, { name: templateName, blocks });
    } else {
      addTemplate({ name: templateName, blocks });
    }
    navigate('/templates');
  };

  return (
    <div className="space-y-6 print-container">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/templates')}
            className="p-2 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 text-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input 
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="text-2xl font-semibold tracking-tight bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-lg px-2 py-1 -ml-2"
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-[var(--border-color)] hover:bg-surface-hover dark:hover:bg-slate-800 text-secondary dark:text-slate-300 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm">
            <Printer className="w-4 h-4" />
            {t('employees.doc.print')}
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm">
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-950 border border-[var(--border-color)] rounded-2xl p-8 min-h-[600px] shadow-sm flex flex-col gap-4">
            {blocks.map((block, index) => (
              <div key={block.id} className="group relative border border-transparent hover:border-accent-200 dark:hover:border-accent-800 rounded-xl p-4 transition-colors">
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                  <button onClick={() => removeBlock(block.id)} className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {block.type === 'text' && (
                  <textarea 
                    value={block.content || ''}
                    onChange={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[index].content = e.target.value;
                      setBlocks(newBlocks);
                    }}
                    className="w-full bg-transparent border-none focus:outline-none resize-none min-h-[100px] text-secondary dark:text-slate-300"
                    placeholder={t('builder.textPlaceholder')}
                  />
                )}
                {block.type === 'table' && (
                  <div className="border border-dashed border-[var(--border-color)] rounded-xl p-8 flex items-center justify-center text-muted">
                    <TableIcon className="w-6 h-6 mr-2" />
                    {t('builder.dataTable')}
                  </div>
                )}
                {block.type === 'signature' && (
                  <div className="border border-dashed border-[var(--border-color)] rounded-xl p-8 flex justify-between items-end text-muted mt-8">
                    <div className="border-t border-strong w-1/3 pt-2 text-center text-sm">{t('builder.employeeSignature')}</div>
                    <div className="border-t border-strong w-1/3 pt-2 text-center text-sm">{t('builder.headSignature')}</div>
                  </div>
                )}
              </div>
            ))}
            
            <div {...clickable(() => addBlock('text'), t('builder.addBlock'))} className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center justify-center text-muted hover:bg-surface-hover dark:hover:bg-slate-900/50 hover:border-accent-300 dark:hover:border-accent-700 transition-colors cursor-pointer">
              <Plus className="w-6 h-6 mb-2 text-accent-400" />
              <p className="font-medium">{t('builder.addBlock')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-accent-500" />
              {t('builder.blocks')}
            </h3>
            <div className="space-y-2">
              <button onClick={() => addBlock('text')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors text-left text-sm font-medium">
                <Type className="w-4 h-4" /> {t('builder.text')}
              </button>
              <button onClick={() => addBlock('table')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors text-left text-sm font-medium">
                <TableIcon className="w-4 h-4" /> {t('builder.table')}
              </button>
              <button onClick={() => addBlock('signature')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors text-left text-sm font-medium">
                <FileSignature className="w-4 h-4" /> {t('builder.signatures')}
              </button>
            </div>
          </div>

          <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-muted uppercase tracking-wider">{t('templates.variables')}</h3>
            <div className="space-y-1">
              {['{{fullName}}', '{{position}}', '{{department}}', '{{hireDate}}', '{{salary}}'].map(variable => (
                <div key={variable} {...clickable(() => { navigator.clipboard.writeText(variable); notify.success(t('builder.copied', { v: variable })); }, variable)} className="px-3 py-2 bg-surface-2 dark:bg-slate-900 rounded-lg text-sm font-mono text-accent-600 dark:text-accent-400 cursor-pointer hover:bg-accent-50 dark:hover:bg-accent-900/30 transition-colors border border-[var(--border-color)]">
                  {variable}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
