import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="absolute inset-0 bg-ocean-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass rounded-2xl shadow-glass-lg w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-scale-in`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-slate-200/60">
            <h3 className="font-display font-bold text-lg text-ocean-900">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
