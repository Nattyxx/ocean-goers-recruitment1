import { GlassCard } from '../components/ui/GlassCard';
import { Ship, Target, Eye, Heart, Award, Users, Globe2, Briefcase, Mail, Phone, MapPin, Send, MessageCircle, LifeBuoy, Settings as SettingsIcon, Bell, Shield, Lock, User } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function AboutPage() {
  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 mb-4">
          <Ship className="w-8 h-8 text-gold-400" />
        </div>
        <h1 className="font-display font-bold text-4xl text-ocean-900 mb-4">About Ocean Goers</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          We are a premier international cruise ship recruitment agency, connecting qualified maritime
          professionals with the world&apos;s leading cruise lines since 2013.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: Target, title: 'Our Mission', text: 'To empower maritime professionals by providing seamless access to international cruise ship career opportunities.' },
          { icon: Eye, title: 'Our Vision', text: 'To be the most trusted and recognized cruise ship recruitment agency across Africa and beyond.' },
          { icon: Heart, title: 'Our Values', text: 'Integrity, transparency, and dedication to every candidate&apos;s success in their maritime career journey.' },
        ].map((c, i) => (
          <GlassCard key={c.title} className="text-center animate-fade-in" >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center mx-auto mb-4">
              <c.icon className="w-6 h-6 text-ocean-900" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ocean-900 mb-2">{c.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Award, value: '12+', label: 'Years Experience' },
          { icon: Users, value: '18.5K+', label: 'Professionals Placed' },
          { icon: Globe2, value: '62', label: 'Countries Served' },
          { icon: Briefcase, value: '48', label: 'Cruise Line Partners' },
        ].map((s) => (
          <GlassCard key={s.label} className="text-center">
            <s.icon className="w-8 h-8 text-ocean-600 mx-auto mb-2" />
            <p className="font-display font-bold text-2xl text-ocean-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast('Message sent! We\'ll get back to you within 24 hours.', 'success');
      setName(''); setEmail(''); setMessage('');
    }, 1200);
  };

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="text-center mb-10">
        <h1 className="font-display font-bold text-4xl text-ocean-900 mb-3">Get in Touch</h1>
        <p className="text-slate-600">Have questions about cruise ship jobs? We&apos;re here to help.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4">Send a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Message</label>
              <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input-field resize-none" placeholder="Your message..." />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? 'Sending...' : <>Send Message <Send className="w-4 h-4" /></>}
            </button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          {[
            { icon: MapPin, title: 'Office', text: 'Bole Road, Africa Avenue, Addis Ababa, Ethiopia' },
            { icon: Phone, title: 'Phone', text: '+251 954 785 794' },
            { icon: Mail, title: 'Email', text: 'info@oceangoers.com' },
            { icon: MessageCircle, title: 'WhatsApp', text: '+251 911 234 567' },
          ].map((c) => (
            <GlassCard key={c.title} className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center flex-shrink-0">
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-ocean-900">{c.title}</h4>
                <p className="text-sm text-slate-600">{c.text}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const services = [
    { icon: Briefcase, title: 'Job Placement', text: 'Apply for positions across all cruise ship departments — deck officers, engineers, hospitality, entertainment, medical, and more.' },
    { icon: Award, title: 'Document Processing', text: 'Complete guidance through passport, seaman book, STCW certification, and all required maritime paperwork.' },
    { icon: Globe2, title: 'Visa Assistance', text: 'Full support for C1/D and Schengen visa applications required for international cruise ship employment.' },
    { icon: Heart, title: 'Medical Screening', text: 'Coordinated medical examinations and fitness certification to meet international maritime standards.' },
    { icon: Shield, title: 'Training & Certification', text: 'STCW training programs, safety courses, and skills certification to qualify for cruise ship roles.' },
    { icon: Ship, title: 'Deployment Support', text: 'End-to-end support from contract signing to airport departure and onboard orientation.' },
  ];

  return (
    <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="text-center mb-12">
        <h1 className="font-display font-bold text-4xl text-ocean-900 mb-3">Our Services</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">Comprehensive recruitment solutions for cruise ship employment — from application to deployment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s, i) => (
          <GlassCard key={s.title} className="group hover:-translate-y-1.5 transition-all animate-fade-in" >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ocean-900 mb-2">{s.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <h1 className="font-display font-bold text-3xl text-ocean-900 mb-2">Messages</h1>
      <p className="text-slate-600 mb-6">Communications from Ocean Goers recruitment team.</p>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-ocean-100 rounded-full animate-spin border-t-ocean-600" />
        </div>
      ) : (
        <GlassCard className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-2">No Messages Yet</h3>
          <p className="text-slate-500">When the recruitment team sends you a message, it will appear here.</p>
        </GlassCard>
      )}
    </div>
  );
}

export function SupportPage() {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast('Support ticket created! We\'ll respond within 24 hours.', 'success');
      setSubject(''); setDesc('');
    }, 1200);
  };

  const faqs = [
    { q: 'How long does the application process take?', a: 'The full process typically takes 4-8 weeks from application to deployment, depending on document verification and visa processing.' },
    { q: 'What documents do I need?', a: 'You\'ll need a valid passport, CV, medical certificate, seaman book, STCW certificate, police clearance, educational certificates, and a passport photo.' },
    { q: 'What is the registration fee?', a: 'A one-time registration fee of 5,000 ETB covers document processing and administrative costs.' },
    { q: 'Do you guarantee job placement?', a: 'While we cannot guarantee placement, our success rate exceeds 85% for candidates who complete all requirements.' },
  ];

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <h1 className="font-display font-bold text-3xl text-ocean-900 mb-2">Support Center</h1>
      <p className="text-slate-600 mb-6">Get help with your application or find answers to common questions.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ocean-900">Create Support Ticket</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Subject</label>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field" placeholder="Brief description" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1.5">Description</label>
              <textarea required value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="input-field resize-none" placeholder="Describe your issue..." />
            </div>
            <button type="submit" disabled={loading} className="btn-ocean w-full disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </GlassCard>

        <div>
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="glass-card p-4 group">
                <summary className="font-medium text-ocean-800 cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-ocean-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName, phone });
    if (error) toast(error, 'error');
    else toast('Settings saved successfully!', 'success');
    setSaving(false);
  };

  return (
    <div className="pt-20 pb-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <h1 className="font-display font-bold text-3xl text-ocean-900 mb-2">Settings</h1>
      <p className="text-slate-600 mb-6">Manage your account preferences.</p>

      <GlassCard className="mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-display font-semibold text-lg text-ocean-900">Account Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Email (read-only)</label>
            <input type="email" value={user?.email ?? ''} disabled className="input-field opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+251 ..." />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-gold disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </GlassCard>

      <GlassCard className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-display font-semibold text-lg text-ocean-900">Notification Preferences</h3>
        </div>
        <div className="space-y-3">
          {['Application updates', 'Interview schedules', 'Document verification', 'Payment confirmations', 'Visa updates'].map((n) => (
            <label key={n} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer">
              <span className="text-sm text-ocean-800">{n}</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-ocean-600" />
            </label>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-display font-semibold text-lg text-ocean-900">Security</h3>
        </div>
        <button onClick={signOut} className="w-full py-3 rounded-xl bg-rose-50 text-rose-600 font-medium hover:bg-rose-100 transition-colors">
          Sign Out of Account
        </button>
      </GlassCard>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="pt-20 pb-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <h1 className="font-display font-bold text-3xl text-ocean-900 mb-6">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none">
        <GlassCard className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>Ocean Goers is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information.</p>
          <h3 className="font-display font-semibold text-ocean-900">Information We Collect</h3>
          <p>We collect personal information including your name, email, phone number, and documents necessary for cruise ship job applications (passport, CV, certifications, etc.).</p>
          <h3 className="font-display font-semibold text-ocean-900">How We Use Your Information</h3>
          <p>Your information is used solely for recruitment purposes — matching you with cruise line opportunities, processing applications, and facilitating deployment.</p>
          <h3 className="font-display font-semibold text-ocean-900">Data Security</h3>
          <p>All data is stored securely using industry-standard encryption. Access is restricted to authorized personnel only. We never sell or share your data with third parties without consent.</p>
          <h3 className="font-display font-semibold text-ocean-900">Your Rights</h3>
          <p>You have the right to access, update, or request deletion of your personal data at any time. Contact us at info@oceangoers.com for any privacy-related requests.</p>
        </GlassCard>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="pt-20 pb-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <h1 className="font-display font-bold text-3xl text-ocean-900 mb-6">Terms & Conditions</h1>
      <GlassCard className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <p>By using Ocean Goers&apos; services, you agree to the following terms and conditions.</p>
        <h3 className="font-display font-semibold text-ocean-900">Eligibility</h3>
        <p>Applicants must be at least 18 years old and possess valid travel documents. Certain positions may have additional age or qualification requirements.</p>
        <h3 className="font-display font-semibold text-ocean-900">Registration Fee</h3>
        <p>A non-refundable registration fee of 5,000 ETB is required to process your application. This covers administrative and document processing costs.</p>
        <h3 className="font-display font-semibold text-ocean-900">Document Accuracy</h3>
        <p>All submitted documents must be authentic and valid. Submission of fraudulent documents will result in immediate disqualification and possible legal action.</p>
        <h3 className="font-display font-semibold text-ocean-900">Placement</h3>
        <p>While we strive to place all qualified candidates, job placement is not guaranteed and depends on cruise line requirements, interview outcomes, and visa approval.</p>
        <h3 className="font-display font-semibold text-ocean-900">Code of Conduct</h3>
        <p>Placed candidates must adhere to the cruise line&apos;s code of conduct and employment terms. Ocean Goers is not liable for employment disputes after deployment.</p>
      </GlassCard>
    </div>
  );
}
