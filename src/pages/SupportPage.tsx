import { useState } from 'react';
import { MessageCircle, Mail, Phone, LifeBuoy, Loader2, ChevronDown } from 'lucide-react';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';

const WHATSAPP_LINK = 'https://wa.me/971588576150?text=Hello%20Ocean%20Goers,%20I%20need%20support%20with%20my%20application.';
const PHONE_LINK = 'tel:+971588576150';
const EMAIL_LINK = 'mailto:info@oceangoers.com?subject=Support%20Request';

const FAQS = [
  { q: 'How long does the application process take?', a: 'The full process typically takes 4-8 weeks from application to deployment, depending on document verification and visa processing.' },
  { q: 'What documents do I need?', a: 'You will need a valid passport, CV, medical certificate, seaman book, STCW certificate, police clearance, educational certificates, and a passport photo.' },
  { q: 'What is the registration fee?', a: 'A one-time registration fee of 5,000 ETB (or $90 USD via crypto) covers document processing and administrative costs.' },
  { q: 'Do you guarantee job placement?', a: 'While we cannot guarantee placement, our success rate exceeds 85% for candidates who complete all requirements.' },
  { q: 'Can I edit my application after submitting?', a: 'You can edit your application until it enters "Under Review" status. After that, changes are disabled.' },
  { q: 'How do I check my application status?', a: 'Log in to your dashboard and visit the My Application page to see your current status and progress timeline.' },
];

export function SupportPage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !desc.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('support_requests').insert({
      user_id: user?.id ?? null,
      name: profile?.full_name ?? null,
      email: profile?.email ?? user?.email ?? null,
      subject: subject.trim(),
      description: desc.trim(),
    });

    if (error) {
      toast('Failed to submit request. Please try again.', 'error');
    } else {
      toast('Support request submitted! We will respond within 24 hours.', 'success');
      setSubject('');
      setDesc('');
    }
    setLoading(false);
  };

  const contactButtons = [
    { icon: MessageCircle, label: 'WhatsApp', href: WHATSAPP_LINK, color: 'from-green-500 to-green-700', external: true },
    { icon: Mail, label: 'Email Us', href: EMAIL_LINK, color: 'from-gold-400 to-gold-600', external: false },
    { icon: Phone, label: 'Call Us', href: PHONE_LINK, color: 'from-ocean-600 to-ocean-800', external: false },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-ocean-900 mb-2">Support Center</h1>
      <p className="text-slate-600 mb-6 text-sm">Get help with your application or find answers to common questions.</p>

      {/* Contact Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {contactButtons.map((btn) => (
          <a
            key={btn.label}
            href={btn.href}
            target={btn.external ? '_blank' : undefined}
            rel={btn.external ? 'noopener noreferrer' : undefined}
            className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-glass hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${btn.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <btn.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-ocean-900">{btn.label}</p>
              <p className="text-xs text-slate-400">Tap to connect</p>
            </div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Form */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ocean-900">Submit a Support Request</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Subject</label>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field text-sm" placeholder="Brief description of your issue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Description</label>
              <textarea required value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="input-field resize-none text-sm" placeholder="Describe your issue in detail..." />
            </div>
            <button type="submit" disabled={loading} className="btn-ocean w-full text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Request'}
            </button>
          </form>
        </GlassCard>

        {/* FAQ */}
        <div>
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="glass-card p-4 group">
                <summary className="font-medium text-sm text-ocean-800 cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-ocean-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
