interface AdSlotProps {
  format?: 'leaderboard' | 'rectangle' | 'sidebar' | 'inline' | 'native';
  className?: string;
}

export function AdSlot({ format = 'rectangle', className = '' }: AdSlotProps) {
  const dimensions: Record<string, { h: string; label: string }> = {
    leaderboard: { h: 'h-24 md:h-28', label: '728×90' },
    rectangle: { h: 'h-56', label: '336×280' },
    sidebar: { h: 'h-64', label: '300×600' },
    inline: { h: 'h-32', label: 'Responsive' },
    native: { h: 'h-28', label: 'Native Ad' },
  };
  const dim = dimensions[format] ?? dimensions.rectangle;

  return (
    <div
      className={`flex items-center justify-center ${dim.h} ${className} rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center`}
      aria-label="Advertisement"
      role="complementary"
    >
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Advertisement</p>
        <p className="text-xs text-slate-300">{dim.label} — Google AdSense</p>
      </div>
    </div>
  );
}
