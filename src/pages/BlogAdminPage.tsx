import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, Eye, Save, X, Loader2, TrendingUp, FileText,
  Clock, CheckCircle2, FileEdit, Calendar, BarChart3, Users, Search,
} from 'lucide-react';
import {
  fetchArticlesForAdmin, fetchCategories, createArticle, updateArticle,
  deleteArticle, slugify, excerptFromContent, readingTime,
  type BlogArticle, type BlogCategory,
} from '../lib/blog';
import { useToast } from '../lib/toast';
import { Modal } from '../components/ui/Modal';

interface Props {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

type EditorState = {
  id: string | null;
  title: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category_id: string;
  author_name: string;
  status: string;
  published_at: string;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
};

const emptyEditor: EditorState = {
  id: null, title: '', excerpt: '', content: '', featured_image: '',
  category_id: '', author_name: 'Ocean Goers Team', status: 'draft',
  published_at: '', is_featured: false, seo_title: '', seo_description: '',
};

export function BlogAdminPage({ onNavigate }: Props) {
  const { toast } = useToast();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [arts, cats] = await Promise.all([fetchArticlesForAdmin(), fetchCategories()]);
    setArticles(arts);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = articles.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.status === 'published').length,
    drafts: articles.filter((a) => a.status === 'draft').length,
    scheduled: articles.filter((a) => a.status === 'scheduled').length,
    totalViews: articles.reduce((sum, a) => sum + (a.views ?? 0), 0),
  };

  const openNew = () => {
    setEditor(emptyEditor);
    setEditorOpen(true);
  };

  const openEdit = (article: BlogArticle) => {
    setEditor({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt ?? '',
      content: article.content,
      featured_image: article.featured_image ?? '',
      category_id: article.category_id ?? '',
      author_name: article.author_name,
      status: article.status,
      published_at: article.published_at ? new Date(article.published_at).toISOString().slice(0, 16) : '',
      is_featured: article.is_featured,
      seo_title: article.seo_title ?? '',
      seo_description: article.seo_description ?? '',
    });
    setEditorOpen(true);
  };

  const handleSave = async (publish = false) => {
    if (!editor.title.trim()) { toast('Title is required.', 'error'); return; }
    if (!editor.content.trim()) { toast('Content is required.', 'error'); return; }

    setSaving(true);
    const status = publish ? 'published' : editor.status;
    const publishedAt = publish
      ? new Date().toISOString()
      : status === 'scheduled' && editor.published_at
        ? new Date(editor.published_at).toISOString()
        : editor.published_at
          ? new Date(editor.published_at).toISOString()
          : null;

    const data = {
      title: editor.title,
      excerpt: editor.excerpt || excerptFromContent(editor.content),
      content: editor.content,
      featured_image: editor.featured_image || null,
      category_id: editor.category_id || null,
      author_name: editor.author_name || 'Ocean Goers Team',
      status,
      published_at: publishedAt,
      is_featured: editor.is_featured,
      seo_title: editor.seo_title || editor.title,
      seo_description: editor.seo_description || excerptFromContent(editor.content),
      og_image: editor.featured_image || null,
    };

    let success = false;
    if (editor.id) {
      success = await updateArticle(editor.id, data);
    } else {
      const created = await createArticle(data as any);
      success = !!created;
    }

    setSaving(false);
    if (success) {
      toast(publish ? 'Article published!' : 'Article saved!', 'success');
      setEditorOpen(false);
      load();
    } else {
      toast('Failed to save article.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteArticle(id);
    if (ok) {
      toast('Article deleted.', 'success');
      setConfirmDelete(null);
      load();
    } else {
      toast('Failed to delete article.', 'error');
    }
  };

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized';

  return (
    <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-ocean-900">Blog Management</h1>
          <p className="text-slate-600 text-sm mt-1">Create, edit, and manage career resource articles.</p>
        </div>
        <button onClick={openNew} className="btn-gold flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Articles', value: stats.total, icon: FileText, color: 'from-ocean-500 to-ocean-700' },
          { label: 'Published', value: stats.published, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-700' },
          { label: 'Drafts', value: stats.drafts, icon: FileEdit, color: 'from-slate-500 to-slate-700' },
          { label: 'Scheduled', value: stats.scheduled, icon: Calendar, color: 'from-gold-400 to-gold-600' },
          { label: 'Total Views', value: stats.totalViews, icon: TrendingUp, color: 'from-sky-500 to-sky-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display font-bold text-2xl text-ocean-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="input-field pl-10 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field text-sm sm:w-48"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* Article List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No articles found.</p>
          <button onClick={openNew} className="btn-ocean text-sm">Create your first article</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Views</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ocean-900 line-clamp-1">{a.title}</div>
                      {a.is_featured && <span className="text-xs text-gold-600 font-semibold">Featured</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{catName(a.category_id)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{a.views ?? 0}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                      {a.published_at ? new Date(a.published_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => onNavigate('blog-article', { slug: a.slug })} className="p-2 rounded-lg text-ocean-600 hover:bg-ocean-50 transition-colors" title="View" disabled={a.status !== 'published'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(a)} className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(a.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={editor.id ? 'Edit Article' : 'New Article'} maxWidth="max-w-3xl">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Title</label>
              <input
                type="text"
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                placeholder="Article title..."
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Excerpt (optional — auto-generated if empty)</label>
              <textarea
                value={editor.excerpt}
                onChange={(e) => setEditor({ ...editor, excerpt: e.target.value })}
                placeholder="Short summary..."
                rows={2}
                className="input-field resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Content (HTML)</label>
              <textarea
                value={editor.content}
                onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                placeholder="<h2>Introduction</h2><p>Your article content...</p>"
                rows={10}
                className="input-field resize-y font-mono text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Reading time: ~{readingTime(editor.content || '0')} min</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">Category</label>
                <select
                  value={editor.category_id}
                  onChange={(e) => setEditor({ ...editor, category_id: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">Author</label>
                <input
                  type="text"
                  value={editor.author_name}
                  onChange={(e) => setEditor({ ...editor, author_name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Featured Image URL</label>
              <input
                type="text"
                value={editor.featured_image}
                onChange={(e) => setEditor({ ...editor, featured_image: e.target.value })}
                placeholder="https://..."
                className="input-field text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">Status</label>
                <select
                  value={editor.status}
                  onChange={(e) => setEditor({ ...editor, status: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">Publish Date (for scheduled)</label>
                <input
                  type="datetime-local"
                  value={editor.published_at}
                  onChange={(e) => setEditor({ ...editor, published_at: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_featured"
                checked={editor.is_featured}
                onChange={(e) => setEditor({ ...editor, is_featured: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-ocean-600 focus:ring-ocean-500"
              />
              <label htmlFor="is_featured" className="text-sm text-ocean-700">Mark as featured article</label>
            </div>

            {/* SEO Fields */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SEO Settings</p>
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">SEO Title (optional)</label>
                <input
                  type="text"
                  value={editor.seo_title}
                  onChange={(e) => setEditor({ ...editor, seo_title: e.target.value })}
                  placeholder="Custom title for search engines..."
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">SEO Description (optional)</label>
                <textarea
                  value={editor.seo_description}
                  onChange={(e) => setEditor({ ...editor, seo_description: e.target.value })}
                  placeholder="Meta description for search engines..."
                  rows={2}
                  className="input-field resize-none text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
              <button onClick={() => setEditorOpen(false)} className="btn-ghost text-ocean-700 border-slate-200 text-sm">
                Cancel
              </button>
              <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 btn-ocean text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Draft</>}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Publish</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Article" maxWidth="max-w-md">
          <p className="text-slate-600 mb-6">Are you sure you want to delete this article? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-ocean-700 border-slate-200 text-sm">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-rose-600 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-rose-700 transition-colors">
              Delete Permanently
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-slate-100 text-slate-600',
    scheduled: 'bg-gold-100 text-gold-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] ?? styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
