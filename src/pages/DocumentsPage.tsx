import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BookUser, FileText, HeartPulse, BookOpen, Award, ShieldCheck, GraduationCap,
  Image, Receipt, Upload, CheckCircle2, XCircle, File, Trash2, Loader2, UploadCloud,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { DOC_TYPES, REQUIRED_DOC_KEYS } from '../lib/constants';
import { sendNotificationEmail, hasEmailBeenSent, documentsReceivedBody } from '../lib/email';

const icons: Record<string, typeof FileText> = {
  BookUser, FileText, HeartPulse, BookOpen, Award, ShieldCheck, GraduationCap, Image, Receipt,
};

interface DocRecord {
  id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  status: string;
  uploaded_at: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false });
    setDocs((data as DocRecord[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const getDoc = (type: string) => docs.find((d) => d.doc_type === type);

  const handleFile = async (docType: string, file: File) => {
    if (!user) return;

    if (!ACCEPTED.includes(file.type)) {
      toast('Only PDF, JPG, and PNG files are supported.', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast('File too large. Maximum size is 10MB.', 'error');
      return;
    }

    setUploading(docType);
    setProgress(0);

    // simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(90, p + 10));
    }, 200);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${docType}.${ext}`;

    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (upErr) {
      clearInterval(interval);
      toast(upErr.message, 'error');
      setUploading(null);
      setProgress(0);
      return;
    }

    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);

    // remove old record if replacing
    const existing = getDoc(docType);
    if (existing) {
      await supabase.from('documents').delete().eq('id', existing.id);
    }

    const { error: dbErr } = await supabase.from('documents').insert({
      user_id: user.id,
      doc_type: docType,
      file_name: file.name,
      file_url: pub.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      status: 'Pending',
    });

    clearInterval(interval);
    setProgress(100);

    if (dbErr) {
      toast(dbErr.message, 'error');
    } else {
      toast(`${DOC_TYPES.find((d) => d.key === docType)?.label} uploaded successfully!`, 'success');
      await loadDocs();

      const updatedDocTypes = [...new Set([...docs.map((d) => d.doc_type), docType])];
      const allRequiredDone = REQUIRED_DOC_KEYS.every((k) => updatedDocTypes.includes(k));
      if (allRequiredDone && user) {
        const alreadySent = await hasEmailBeenSent(user.id, 'documents_received');
        if (!alreadySent) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .maybeSingle();
          if (prof?.email) {
            await sendNotificationEmail({
              userId: user.id,
              emailTo: prof.email,
              recipientName: prof.full_name ?? 'Applicant',
              emailType: 'documents_received',
              subject: 'Documents Received – Registration Payment Required',
              bodyHtml: documentsReceivedBody(prof.full_name ?? 'Applicant'),
            }).catch(() => {});
          }
        }
      }
    }

    setTimeout(() => {
      setUploading(null);
      setProgress(0);
    }, 600);
  };

  const handleDelete = async (docType: string) => {
    const doc = getDoc(docType);
    if (!doc || !user) return;

    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Document deleted.', 'info');
      await loadDocs();
    }
  };

  const handleDrop = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(docType, file);
  };

  const completedCount = docs.length;
  const totalCount = DOC_TYPES.length;
  const completionPct = Math.round((completedCount / totalCount) * 100);

  if (loading) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size={48} className="text-ocean-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-ocean-900 mb-2">Document Submission Portal</h1>
        <p className="text-slate-600">Upload all required documents to complete your application. Files must be PDF, JPG, or PNG (max 10MB).</p>
      </div>

      {/* Progress overview */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold text-lg text-ocean-900">Upload Progress</h3>
            <p className="text-sm text-slate-500">{completedCount} of {totalCount} documents uploaded</p>
          </div>
          <div className="text-right">
            <span className="font-display font-bold text-3xl text-gradient-ocean">{completionPct}%</span>
          </div>
        </div>
        <ProgressBar value={completionPct} />
      </GlassCard>

      {/* Document grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOC_TYPES.map((dt, i) => {
          const Icon = icons[dt.icon] ?? FileText;
          const doc = getDoc(dt.key);
          const isUploading = uploading === dt.key;

          return (
            <div
              key={dt.key}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <GlassCard className="h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-ocean-900">{dt.label}</h4>
                      {doc ? (
                        <StatusBadge status={doc.status as any} size="sm" />
                      ) : (
                        <span className="text-xs text-slate-400">Not uploaded</span>
                      )}
                    </div>
                  </div>
                  {doc && (
                    <span className="text-xs text-slate-400">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {doc ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-3">
                      <FileText className="w-4 h-4 text-ocean-500 flex-shrink-0" />
                      <span className="text-xs text-slate-600 truncate flex-1">{doc.file_name}</span>
                      <span className="text-xs text-slate-400">{(doc.file_size / 1024).toFixed(0)}KB</span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-sm py-2 rounded-lg bg-ocean-50 text-ocean-700 font-medium hover:bg-ocean-100 transition-colors"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(dt.key)}
                        className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : isUploading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-8 h-8 text-ocean-500 animate-spin mb-3" />
                    <ProgressBar value={progress} className="mb-2" />
                    <p className="text-xs text-slate-500">Uploading... {progress}%</p>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(dt.key); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => handleDrop(e, dt.key)}
                    onClick={() => fileRefs.current[dt.key]?.click()}
                    className={`flex-1 flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                      dragOver === dt.key ? 'border-ocean-500 bg-ocean-50 scale-105' : 'border-slate-200 hover:border-ocean-300 hover:bg-slate-50'
                    }`}
                  >
                    <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${dragOver === dt.key ? 'text-ocean-500' : 'text-slate-400'}`} />
                    <p className="text-xs text-slate-500 font-medium">Drag & drop or browse</p>
                    <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG · max 10MB</p>
                  </div>
                )}

                <input
                  ref={(el) => { fileRefs.current[dt.key] = el; }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(dt.key, f);
                    e.target.value = '';
                  }}
                />
              </GlassCard>
            </div>
          );
        })}
      </div>

      {completionPct === 100 && (
        <div className="mt-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-scale-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">All documents uploaded!</p>
            <p className="text-sm text-emerald-600">Your documents are now pending verification. We&apos;ll notify you once they&apos;re reviewed.</p>
          </div>
        </div>
      )}
    </div>
  );
}
