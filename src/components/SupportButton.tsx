import { useState, useEffect, useRef, useCallback } from 'react';
import { Headset, X, Send, MessageCircle } from 'lucide-react';
import { SUPPORT_CONTACTS } from '../lib/constants';

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleClickOutside, handleEscape]);

  const handleToggle = () => setOpen((v) => !v);
  const handleClose = () => setOpen(false);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-3"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {open && (
        <div
          role="menu"
          aria-label="Support options"
          className="w-[calc(100vw-2rem)] max-w-xs sm:w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-support-menu"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-ocean-900 to-ocean-800">
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-gold-400" />
              <span className="text-white font-display font-semibold text-sm">OCEAN GOERS Support</span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close support menu"
              className="text-ocean-200 hover:text-white transition-colors p-1 -mr-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2.5 space-y-2">
            <a
              href={SUPPORT_CONTACTS.telegram.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              role="menuitem"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                <Send className="w-5 h-5 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-ocean-900">{SUPPORT_CONTACTS.telegram.label}</p>
                <p className="text-xs text-slate-500 truncate">{SUPPORT_CONTACTS.telegram.text}</p>
                <p className="text-xs text-sky-600 font-medium">{SUPPORT_CONTACTS.telegram.username}</p>
              </div>
            </a>

            <a
              href={SUPPORT_CONTACTS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              role="menuitem"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-ocean-900">{SUPPORT_CONTACTS.whatsapp.label}</p>
                <p className="text-xs text-slate-500 truncate">{SUPPORT_CONTACTS.whatsapp.text}</p>
                <p className="text-xs text-emerald-600 font-medium">{SUPPORT_CONTACTS.whatsapp.phone}</p>
              </div>
            </a>
          </div>
        </div>
      )}

      <button
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close support menu' : 'Open support menu'}
        className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full bg-gradient-to-r from-ocean-900 to-ocean-800 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-ocean-700/50"
      >
        {open ? (
          <X className="w-5 h-5 text-gold-400" />
        ) : (
          <Headset className="w-5 h-5 text-gold-400" />
        )}
        <span className="hidden sm:inline">Support</span>
      </button>
    </div>
  );
}
