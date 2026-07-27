import { APPLICATION_STEPS } from '../lib/constants';
import {
  UserCheck, FileText, FolderCheck, CreditCard, BadgeCheck, Search, Video,
  HeartPulse, Plane, Ship,
  CheckCircle2, Circle, Loader2, AlertCircle,
} from 'lucide-react';

const icons: Record<string, typeof FileText> = {
  UserCheck, FileText, FolderCheck, CreditCard, BadgeCheck, Search, Video,
  HeartPulse, Plane, Ship,
};

export type PaymentStatus = 'none' | 'pending' | 'verified' | 'rejected';

export function ApplicationTimeline({
  currentStep,
  hasDocuments = true,
  paymentStatus = 'none',
}: {
  currentStep: number;
  hasDocuments?: boolean;
  paymentStatus?: PaymentStatus;
}) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-6">
        {APPLICATION_STEPS.map((step, i) => {
          const Icon = icons[step.icon] ?? Circle;
          const isCurrent = i === currentStep - 1;
          const isPast = i < currentStep - 1;
          const isPending = i > currentStep - 1;

          // Step 3 (Documents Uploaded) — incomplete if docs not all in
          const docsIncomplete = i === 2 && !hasDocuments && currentStep <= 3;
          // Step 4 (Registration Fee Paid) — awaiting payment
          const feeAwaiting = i === 3 && paymentStatus === 'none' && isCurrent;
          // Step 5 (Payment Verified) — awaiting verification or rejected
          const payAwaiting = i === 4 && paymentStatus === 'pending' && isCurrent;
          const payRejected = i === 4 && paymentStatus === 'rejected';

          const isComplete = isPast && !docsIncomplete;
          const warning = docsIncomplete || payRejected;

          return (
            <div key={step.key} className="relative flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-all duration-500 ${
                  isComplete ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' :
                  warning ? 'bg-rose-400 text-white shadow-md shadow-rose-200' :
                  isCurrent ? 'bg-gold-400 text-ocean-900 shadow-gold ring-4 ring-gold-100' :
                  'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {isComplete ? <CheckCircle2 className="w-5 h-5" /> :
                 warning ? <AlertCircle className="w-5 h-5" /> :
                 isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 <Icon className="w-5 h-5" />}
              </div>

              <div className={`flex-1 pt-1.5 pb-2 ${isPending ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <h4 className={`font-display font-semibold text-sm ${isComplete || isCurrent || warning ? 'text-ocean-900' : 'text-slate-500'}`}>
                    {step.label}
                  </h4>
                  {isComplete && (
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
                  )}
                  {docsIncomplete && (
                    <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Incomplete</span>
                  )}
                  {feeAwaiting && (
                    <span className="text-xs text-gold-700 font-medium bg-gold-100 px-2 py-0.5 rounded-full">Awaiting Payment</span>
                  )}
                  {payAwaiting && (
                    <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Pending Verification</span>
                  )}
                  {payRejected && (
                    <span className="text-xs text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-full">Rejected</span>
                  )}
                  {isCurrent && !feeAwaiting && !payAwaiting && !payRejected && (
                    <span className="text-xs text-gold-700 font-medium bg-gold-100 px-2 py-0.5 rounded-full">In Progress</span>
                  )}
                </div>
                {isCurrent && !feeAwaiting && !payAwaiting && !payRejected && i > 4 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Your application is currently at this stage. We&apos;ll notify you when it moves forward.
                  </p>
                )}
                {docsIncomplete && (
                  <p className="text-xs text-amber-600 mt-1">
                    Upload all required documents to complete this stage.
                  </p>
                )}
                {feeAwaiting && (
                  <p className="text-xs text-gold-700 mt-1">
                    Pay the registration fee to move to the next stage.
                  </p>
                )}
                {payAwaiting && (
                  <p className="text-xs text-amber-600 mt-1">
                    Your receipt is being reviewed. We&apos;ll notify you once verified.
                  </p>
                )}
                {payRejected && (
                  <p className="text-xs text-rose-600 mt-1">
                    Your receipt was rejected. Please upload a new payment receipt.
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
