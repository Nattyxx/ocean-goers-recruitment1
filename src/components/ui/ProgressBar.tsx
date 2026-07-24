export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full bg-slate-200/70 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-ocean-500 to-ocean-400 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
