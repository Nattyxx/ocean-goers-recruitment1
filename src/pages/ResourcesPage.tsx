import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Download, FileText, Loader2, Upload } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { Skeleton } from '../components/ui/Skeleton';

interface ResourceDoc {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  category: string | null;
  created_at: string;
}

const CATEGORIES = [
  { key: 'interview_tips', label: 'Cruise Interview Tips', icon: '🎤' },
  { key: 'documents_guide', label: 'Required Documents Guide', icon: '📋' },
  { key: 'packing_checklist', label: 'Packing Checklist', icon: '🧳' },
  { key: 'contract_info', label: 'Contract Information', icon: '📄' },
  { key: 'safety_guidelines', label: 'Safety Guidelines', icon: '⚠️' },
  { key: 'company_policies', label: 'Company Policies', icon: '🏢' },
];

export function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<ResourceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setResources(data as ResourceDoc[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = activeCategory === 'all' ? resources : resources.filter((r) => r.category === activeCategory);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-ocean-900 mb-2">Training & Resources</h1>
      <p className="text-slate-600 mb-6 text-sm">Download guides, checklists, and training materials for your cruise ship career.</p>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === 'all' ? 'bg-ocean-600 text-white' : 'bg-white text-ocean-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Resources
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.key ? 'bg-ocean-600 text-white' : 'bg-white text-ocean-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="mr-1.5">{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No resources available yet. Check back soon!</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource, i) => (
            <div key={resource.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <GlassCard className="h-full flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-semibold text-sm text-ocean-900">{resource.title}</h4>
                    {resource.category && <p className="text-xs text-ocean-500 mt-0.5">{CATEGORIES.find((c) => c.key === resource.category)?.label ?? resource.category}</p>}
                  </div>
                </div>
                {resource.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{resource.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{resource.file_size ? `${(resource.file_size / 1024).toFixed(0)} KB` : ''}</span>
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ocean-600 hover:text-ocean-700"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
