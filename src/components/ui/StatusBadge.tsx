type Variant =
  | 'Pending' | 'Awaiting Payment' | 'Pending Verification'
  | 'Under Review' | 'Interview' | 'Approved' | 'Rejected'
  | 'Verified' | 'Medical' | 'Visa Processing' | 'Deployment';

const styles: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  'Awaiting Payment': 'bg-amber-100 text-amber-700 border-amber-200',
  'Pending Verification': 'bg-amber-100 text-amber-700 border-amber-200',
  'Under Review': 'bg-ocean-100 text-ocean-700 border-ocean-200',
  Interview: 'bg-violet-100 text-violet-700 border-violet-200',
  Medical: 'bg-rose-100 text-rose-700 border-rose-200',
  'Visa Processing': 'bg-sky-100 text-sky-700 border-sky-200',
  Deployment: 'bg-teal-100 text-teal-700 border-teal-200',
  Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

export function StatusBadge({ status, size = 'md' }: { status: Variant; size?: 'sm' | 'md' }) {
  const cls = styles[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${cls} ${sz}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
