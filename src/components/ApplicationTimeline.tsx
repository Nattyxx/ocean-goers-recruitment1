import { APPLICATION_STEPS } from '../lib/constants';
import {
  FileText, FolderCheck, Search, Video, HeartPulse, Plane, Ship,
  CheckCircle2, Circle, Loader2, AlertCircle,
} from 'lucide-react';

const icons: Record<string, typeof FileText> = {
  FileText, FolderCheck, Search, Video, HeartPulse, Plane, Ship,
};

export function ApplicationTimeline({ currentStep, hasDocuments = true }: { currentStep: number; hasDocuments?: boolean }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-6">
        {APPLICATION_STEPS.map((step, i) => {
          const Icon = icons[step.icon] ?? Circle;
          const isCurrent = i === currentStep - 1;
          const isPast = i < currentStep - 1;
          // "Documents Received" only counts as completed when docs are actually uploaded
          const docsIncomplete = i === 1 && !hasDocuments && currentStep > 2;
          const isComplete = isPast && !docsIncomplete;
          const isPending = i > currentStep - 1;

          return (
            <div key={step.key} className="relative flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-all duration-500 ${
                  isComplete ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' :
                  docsIncomplete ? 'bg-amber-400 text-white shadow-md shadow-amber-200' :
                  isCurrent ? 'bg-gold-400 text-ocean-900 shadow-gold ring-4 ring-gold-100' :
                  'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {isComplete ? <CheckCircle2 className="w-5 h-5" /> :
                 docsIncomplete ? <AlertCircle className="w-5 h-5" /> :
                 isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 <Icon className="w-5 h-5" />}
              </div>

              <div className={`flex-1 pt-1.5 pb-2 ${isPending ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <h4 className={`font-display font-semibold text-sm ${isComplete || isCurrent || docsIncomplete ? 'text-ocean-900' : 'text-slate-500'}`}>
                    {step.label}
                  </h4>
                  {isComplete && (
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
                  )}
                  {docsIncomplete && (
                    <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Incomplete</span>
                  )}
                  {isCurrent && (
                    <span className="text-xs text-gold-700 font-medium bg-gold-100 px-2 py-0.5 rounded-full">In Progress</span>
                  )}
                </div>
                {isCurrent && (
                  <p className="text-xs text-slate-500 mt-1">
                    Your application is currently at this stage. We&apos;ll notify you when it moves forward.
                  </p>
                )}
                {docsIncomplete && (
                  <p className="text-xs text-amber-600 mt-1">
                    Upload your documents to complete this stage.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
