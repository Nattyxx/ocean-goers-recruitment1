import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} style={{ width: size, height: size }} />;
}

export function FullPageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-ocean-100" />
        <Spinner size={64} className="text-ocean-600 absolute inset-0" />
      </div>
      <p className="text-ocean-600 font-medium animate-pulse">{label}</p>
    </div>
  );
}

export function ButtonSpinner() {
  return <Spinner size={20} className="text-current" />;
}
