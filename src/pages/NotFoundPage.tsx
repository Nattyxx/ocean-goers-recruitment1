import { Ship, ArrowLeft, Compass } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export function NotFoundPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-950 flex items-center justify-center px-4 py-20">
      <div className="absolute inset-0 hero-grid opacity-10" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-ocean-400/10 rounded-full blur-3xl" />

      <div className="relative text-center max-w-lg mx-auto animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center shadow-xl">
            <Ship className="w-10 h-10 text-gold-400" />
          </div>
        </div>

        <p className="font-display font-extrabold text-7xl sm:text-8xl text-gradient-gold mb-4 leading-none">
          404
        </p>

        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-3">
          Page Not Found
        </h1>

        <p className="text-ocean-200 text-base sm:text-lg mb-8 leading-relaxed">
          Sorry, the page you're looking for doesn't exist. The URL may be mistyped
          or the page may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 text-ocean-900 font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/15 transition-all duration-200"
          >
            <Compass className="w-4 h-4" />
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
