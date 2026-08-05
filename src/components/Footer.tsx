import { Ship, Facebook, Send, MessageCircle, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: Props) {
  const links = [
    { label: 'About Ocean Goers', page: 'about' },
    { label: 'Career Resources', page: 'blog' },
    { label: 'Contact', page: 'contact' },
    { label: 'Privacy Policy', page: 'privacy' },
    { label: 'Terms & Conditions', page: 'terms' },
  ];

  const socials = [
    { icon: Facebook, label: 'Facebook', href: '#' },
    { icon: Send, label: 'Telegram', href: '#' },
    { icon: MessageCircle, label: 'WhatsApp', href: '#' },
    { icon: Linkedin, label: 'LinkedIn', href: '#' },
  ];

  return (
    <footer className="relative bg-ocean-950 text-ocean-100 mt-20 overflow-hidden">
      <div className="absolute inset-0 hero-grid opacity-20" />
      <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center">
                <Ship className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-white">Ocean Goers</span>
                <span className="block text-[10px] tracking-widest uppercase text-ocean-400">Cruise Recruitment</span>
              </div>
            </div>
            <p className="text-sm text-ocean-300 leading-relaxed">
              Your trusted partner for international cruise ship employment. We connect qualified candidates with top cruise lines worldwide.
            </p>
            <div className="flex gap-3 mt-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full bg-ocean-800/60 border border-ocean-700/50 flex items-center justify-center hover:bg-gold-400 hover:text-ocean-900 hover:border-gold-400 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {links.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => onNavigate(l.page)}
                    className="text-sm text-ocean-300 hover:text-gold-400 transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4">Services</h4>
            <ul className="space-y-2.5">
              {['Cruise Ship Jobs', 'Document Processing', 'Visa Assistance', 'Medical Screening', 'Training & Certification'].map((s) => (
                <li key={s}>
                  <button onClick={() => onNavigate('services')} className="text-sm text-ocean-300 hover:text-gold-400 transition-colors">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4">Get in Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-ocean-300">
                <MapPin className="w-4 h-4 mt-0.5 text-gold-400 flex-shrink-0" />
                <span>Dubai, United Arab Emirates<br />Office 1208, Marina Plaza Tower, Dubai Marina</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-ocean-300">
                <Phone className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span>+971 58 857 6150</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-ocean-300">
                <Mail className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span>info@oceangoersrecruitment.ae</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-ocean-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ocean-400">
            © {new Date().getFullYear()} Ocean Goers. All rights reserved.
          </p>
          <p className="text-xs text-ocean-400">
            Licensed International Recruitment Agency
          </p>
        </div>
      </div>
    </footer>
  );
}
