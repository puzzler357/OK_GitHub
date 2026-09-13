import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Book, FileText, ChevronRight, Hash, Bookmark, ArrowLeft, Save, Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

const MenuBar = ({ editor }: { editor: any }) => {
  const { t } = useTranslation();
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-surface border-b border-line rounded-t-xl items-center">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.bold")}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.italic")}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('strike') ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.strike")}
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-surface-4 mx-1"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.h1")}
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.h2")}
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-surface-4 mx-1"></div>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.bulletList")}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-surface-4 text-primary' : 'text-muted hover:bg-surface-hover hover:text-primary'}`}
        title={t("kb.toolbar.orderedList")}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-surface-4 mx-1"></div>
      
      <button
        onClick={() => editor.chain().focus().setColor('#10b981').run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('textStyle', { color: '#10b981' }) ? 'bg-surface-4 text-primary' : 'text-emerald-500 hover:bg-surface-hover'}`}
        title={t("kb.toolbar.greenText")}
      >
        <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
      </button>
      <button
        onClick={() => editor.chain().focus().setColor('#f43f5e').run()}
        className={`p-2 rounded-lg transition-colors ${editor.isActive('textStyle', { color: '#f43f5e' }) ? 'bg-surface-4 text-primary' : 'text-rose-500 hover:bg-surface-hover'}`}
        title={t("kb.toolbar.redText")}
      >
        <div className="w-4 h-4 rounded-full bg-rose-500"></div>
      </button>
    </div>
  );
};

export default function KnowledgeBase() {
  const { t } = useTranslation();
  const [isWriting, setIsWriting] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('1');

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: `<p>${t('kb.editorPlaceholder')}</p>`,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none min-h-[400px] max-w-none p-6 text-primary',
      },
    },
  });

  const categories = [
    { id: 1, name: 'HR Политики', count: 12, icon: Book },
    { id: 2, name: 'Инструкции (IT)', count: 8, icon: FileText },
    { id: 3, name: 'Справочник сотрудника', count: 5, icon: Hash },
    { id: 4, name: 'FAQ', count: 24, icon: Bookmark },
  ];

  const [articles, setArticles] = useState([
    { id: 1, title: 'Как оформить отпуск?', category: 'HR Политики', reads: 342, content: '<p>Для оформления отпуска необходимо написать заявление минимум за 14 дней.</p>' },
    { id: 2, title: 'Настройка VPN', category: 'Инструкции (IT)', reads: 215, content: '<p>Инструкция по настройке корпоративного VPN на различных операционных системах.</p>' },
    { id: 3, title: 'Правила компенсации расходов', category: 'HR Политики', reads: 189, content: '<p>Компенсация расходов на обучение и спорт производится после испытательного срока.</p>' },
    { id: 4, title: 'ДМС: как воспользоваться', category: 'Справочник сотрудника', reads: 156, content: '<p>Медицинская страховка доступна всем сотрудникам через 3 месяца работы.</p>' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewingArticle, setViewingArticle] = useState<any | null>(null);

  const handleSave = () => {
    if (!articleTitle) return;
    const catName = categories.find(c => c.id.toString() === articleCategory)?.name || t('kb.general');
    setArticles([...articles, {
      id: Date.now(),
      title: articleTitle,
      category: catName,
      reads: 0,
      content: editor?.getHTML() || ''
    }]);
    alert(t('kb.saved'));
    setIsWriting(false);
    setArticleTitle('');
    editor?.commands.setContent(`<p>${t('kb.editorPlaceholder')}</p>`);
  };

  if (isWriting) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsWriting(false)}
              className="p-2 bg-surface border border-line hover:bg-surface-hover rounded-xl transition-colors text-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary">{t('kb.newArticle')}</h2>
              <p className="text-muted mt-1">{t('kb.newArticleSub')}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted mb-2">{t('kb.articleTitle')}</label>
              <input
                type="text"
                value={articleTitle}
                onChange={e => setArticleTitle(e.target.value)}
                placeholder={t('kb.titlePh')}
                className="w-full bg-app border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">{t('kb.category')}</label>
              <select 
                value={articleCategory}
                onChange={e => setArticleCategory(e.target.value)}
                className="w-full bg-app border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">{t('kb.content')}</label>
            <div className="bg-app border border-line rounded-xl overflow-hidden flex flex-col">
              <MenuBar editor={editor} />
              <EditorContent editor={editor} className="flex-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          article.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? article.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  if (viewingArticle) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewingArticle(null)}
            className="p-2 bg-surface border border-line hover:bg-surface-hover rounded-xl transition-colors text-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{viewingArticle.title}</h2>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-8 prose prose-slate prose-invert max-w-none">
          <div className="flex items-center gap-2 mb-6 not-prose">
            <span className="text-xs text-accent-400 bg-accent-500/10 px-2 py-1 rounded-md">{viewingArticle.category}</span>
            <span className="text-xs text-muted">{t('kb.reads', { count: viewingArticle.reads })}</span>
          </div>
          <div dangerouslySetInnerHTML={{ __html: viewingArticle.content }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t('kb.title')}</h2>
          <p className="text-muted mt-1">{t('kb.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsWriting(true)}
          className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          {t('kb.writeArticle')}
        </button>
      </div>

      <div className="relative max-w-2xl mx-auto my-8">
        <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('kb.searchPh')}
          className="w-full bg-surface border-2 border-line rounded-2xl pl-14 pr-4 py-4 text-base focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors shadow-lg shadow-black/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {categories.map(cat => (
          <div key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)} className={`${selectedCategory === cat.name ? 'bg-surface-3 border-accent-500' : 'bg-surface border-line'} hover:border-strong rounded-2xl p-6 cursor-pointer transition-colors group`}>
            <div className="w-12 h-12 bg-surface-3 text-accent-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <cat.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-primary mb-1">{cat.name}</h3>
            <p className="text-sm text-muted">{t('kb.articlesCount', { count: cat.count })}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-primary mb-4">{searchQuery || selectedCategory ? t('kb.searchResults') : t('kb.popular')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map(article => (
            <div key={article.id} onClick={() => setViewingArticle(article)} className="bg-surface-2 border border-line hover:bg-surface-hover rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-muted">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-primary">{article.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded">{article.category}</span>
                    <span className="text-xs text-muted">• {t('kb.reads', { count: article.reads })}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
