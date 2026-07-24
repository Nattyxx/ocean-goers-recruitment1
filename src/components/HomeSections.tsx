import { useEffect, useRef, useState } from 'react';
import { Ship, Anchor, Waves, Compass, ArrowRight, CheckCircle2, Users, Globe2, Briefcase, Award } from 'lucide-react';
import { STATS } from '../lib/constants';

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function AnimatedNumber({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span>{n.toLocaleString()}{suffix}</span>;
}

export function Hero({ onApply, onLogin, onStatus }: { onApply: () => void; onLogin: () => void; onStatus: () => void; }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ocean-950 via-ocean-800 to-ocean-600" />
      <div className="absolute inset-0 hero-grid opacity-30" />
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1058959/pexels-photo-1058959.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Cruise ship at sea"
          className="w-full h-full object-cover opacity-30"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-950/80 via-ocean-800/60 to-ocean-600/40" />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-ocean-400/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
          <Anchor className="w-4 h-4 text-gold-400" />
          <span className="text-sm text-ocean-50 font-medium tracking-wide">International Cruise Ship Recruitment</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl text-white leading-tight mb-6 animate-slide-up">
          Apply for{' '}
          <span className="relative inline-block">
            <span className="text-gradient-gold">Cruise Ship Jobs</span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
              <path d="M2 9C50 3 150 3 298 9" stroke="#facc15" strokeWidth="3" strokeLinecap="round" className="animate-fade-in" style={{ animationDelay: '0.5s' }} />
            </svg>
          </span>
          <br />
          Worldwide
        </h1>

        <p className="text-lg sm:text-xl text-ocean-100 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Join thousands of maritime professionals working on the world's finest cruise lines.
          Your dream career at sea starts here.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button onClick={onApply} className="btn-gold flex items-center gap-2 group">
            Apply Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={onLogin} className="btn-ghost">Login</button>
          <button onClick={onStatus} className="btn-ghost border-gold-400/40 text-gold-300 hover:bg-gold-400/10">
            Check Application Status
          </button>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-ocean-200 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          {[
            { icon: CheckCircle2, text: 'Licensed Agency' },
            { icon: Award, text: '48 Cruise Lines' },
            { icon: Globe2, text: '62 Countries' },
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-2 text-sm">
              <t.icon className="w-4 h-4 text-gold-400" />
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" preserveAspectRatio="none" className="w-full h-[60px] sm:h-[100px]">
          <path d="M0 50L60 55.8C120 62 240 75 360 70.8C480 67 600 45 720 41.7C840 38 960 53 1080 58.3C1200 62 1320 55 1380 52.2L1440 50V100H0Z" fill="#f8fafc" fillOpacity="0.95"/>
        </svg>
      </div>
    </section>
  );
}

export function StatsSection() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const icons: Record<string, typeof Briefcase> = { jobs: Briefcase, applicants: Users, partners: Ship, countries: Globe2 };
  return (
    <section className="relative -mt-10 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {STATS.map((s, i) => {
          const Icon = icons[s.key];
          return (
            <div
              key={s.key}
              className="glass-card p-5 sm:p-7 text-center group hover:-translate-y-1.5 transition-all duration-300"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-ocean-500 to-ocean-700 mb-3 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-4xl text-ocean-900">
                <AnimatedNumber value={s.value} suffix={s.suffix} inView={inView} />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AboutSection() {
  const features = [
    { icon: Compass, title: 'Global Network', text: 'Partnered with 48+ international cruise lines across 62 countries.' },
    { icon: Award, title: 'Verified Agency', text: 'Licensed and certified maritime recruitment specialists.' },
    { icon: Users, title: '18,500+ Placed', text: 'Successful placements across all major cruise ship departments.' },
    { icon: Ship, title: 'Full Support', text: 'From application to deployment — we handle every step.' },
  ];
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="inline-block px-3 py-1 rounded-full bg-ocean-100 text-ocean-700 text-xs font-semibold tracking-wide uppercase mb-4">About Us</span>
        <h2 className="font-display font-bold text-3xl sm:text-4xl text-ocean-900 mb-4">
          Your Bridge to a Career at Sea
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Ocean Goers is a premier international cruise ship recruitment agency dedicated to connecting
          qualified maritime professionals with the world's leading cruise lines. With over a decade of
          experience, we've built a reputation for excellence, integrity, and successful placements.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="glass-card p-6 group hover:-translate-y-1.5 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
              <f.icon className="w-6 h-6 text-ocean-900" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ocean-900 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ServicesSection() {
  const services = [
    { icon: Briefcase, title: 'Job Placement', text: 'Apply for positions across all cruise ship departments — deck, engine, hospitality, entertainment, and more.' },
    { icon: CheckCircle2, title: 'Document Processing', text: 'We guide you through passport, seaman book, STCW, and all required certification paperwork.' },
    { icon: Globe2, title: 'Visa Assistance', text: 'Complete visa application support for C1/D and Schengen visas required for cruise ship employment.' },
    { icon: Award, title: 'Training & Certification', text: 'STCW training, medical screening, and certification programs to meet international standards.' },
  ];
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-ocean-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-semibold tracking-wide uppercase mb-4">Our Services</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ocean-900 mb-4">
            Complete Recruitment Solutions
          </h2>
          <p className="text-slate-600">Everything you need to launch your maritime career, all in one place.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((s, i) => (
            <div
              key={s.title}
              className="glass-card p-7 flex gap-5 group hover:-translate-y-1 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <s.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-xl text-ocean-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection({ onApply }: { onApply: () => void }) {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-ocean-800 via-ocean-700 to-ocean-600 p-10 sm:p-16 text-center">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gold-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-ocean-400/20 rounded-full blur-3xl" />
        <div className="relative">
          <Waves className="w-12 h-12 text-gold-400 mx-auto mb-4" />
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">
            Ready to Set Sail on Your New Career?
          </h2>
          <p className="text-ocean-100 max-w-xl mx-auto mb-8">
            Join thousands of maritime professionals who launched their cruise ship careers with Ocean Goers.
            Your adventure at sea begins with a single application.
          </p>
          <button onClick={onApply} className="btn-gold inline-flex items-center gap-2 group">
            Start Your Application
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
