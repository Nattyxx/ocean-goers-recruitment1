import { useState, useEffect, useMemo } from 'react';
import { Loader2, Send, Eye, AlertTriangle, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useToast } from '../lib/toast';
import { sendNotificationEmail, wasEmailSentRecently, MANUAL_EMAIL_TEMPLATES, manualUploadReminderBody, manualPaymentRequestBody, interviewInvitationBody, customEmailBody, EMAIL_LABELS } from '../lib/email';

export interface ManualEmailRecipient {
  userId: string;
  email: string;
  fullName: string;
}

interface ManualEmailModalProps {
  open: boolean;
  onClose: () => void;
  recipients: ManualEmailRecipient[];
  sentBy: string | null;
  onSent: () => void;
}

type TemplateKey = (typeof MANUAL_EMAIL_TEMPLATES)[number]['key'];

export function ManualEmailModal({ open, onClose, recipients, sentBy, onSent }: ManualEmailModalProps) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<TemplateKey>('upload_reminder');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string[]>([]);
  const [confirmOverride, setConfirmOverride] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tmpl = MANUAL_EMAIL_TEMPLATES.find((t) => t.key === template);
    if (tmpl) setSubject(tmpl.subject);
    if (template === 'custom') setMessage('');
    setConfirmOverride(false);
  }, [open, template]);

  const selectedTemplate = useMemo(() => MANUAL_EMAIL_TEMPLATES.find((t) => t.key === template)!, [template]);

  const getBodyHtml = (fullName: string): string => {
    switch (template) {
      case 'upload_reminder': return manualUploadReminderBody(fullName);
      case 'payment_request': return manualPaymentRequestBody(fullName);
      case 'interview': return interviewInvitationBody(fullName, interviewDate, interviewLocation, interviewLocation, interviewNotes);
      case 'custom': return customEmailBody(fullName, message);
    }
  };

  const getEmailType = (): string => selectedTemplate.getType();

  const handleSend = async () => {
    if (recipients.length === 0) { toast('No recipients selected.', 'error'); return; }
    if (!subject.trim()) { toast('Subject is required.', 'error'); return; }
    if (template === 'custom' && !message.trim()) { toast('Message is required.', 'error'); return; }
    if (template === 'interview' && (!interviewDate || !interviewTime || !interviewLocation)) {
      toast('Interview date, time, and location are required.', 'error'); return;
    }

    // Check for duplicates within 24h unless override is set
    if (!confirmOverride) {
      const emailType = getEmailType();
      const checks = await Promise.all(recipients.map((r) => wasEmailSentRecently(r.userId, emailType, 24)));
      const dups = recipients.filter((_, i) => checks[i]);
      if (dups.length > 0) {
        setDuplicateWarning(dups.map((r) => r.fullName));
        return;
      }
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      const bodyHtml = getBodyHtml(recipient.fullName);
      const metadata = template === 'interview'
        ? { date: interviewDate, time: interviewTime, location: interviewLocation, notes: interviewNotes }
        : template === 'custom'
          ? { custom_message: message }
          : null;

      const res = await sendNotificationEmail({
        userId: recipient.userId,
        emailTo: recipient.email,
        recipientName: recipient.fullName,
        emailType: getEmailType(),
        subject,
        bodyHtml,
        metadata: metadata ?? undefined,
        forceResend: confirmOverride,
        sentBy,
      });

      if (res.success) successCount++;
      else failCount++;
    }

    setSending(false);
    setConfirmOverride(false);
    setDuplicateWarning([]);

    if (failCount === 0) {
      toast(`Email sent to ${successCount} recipient${successCount > 1 ? 's' : ''}.`, 'success');
    } else if (successCount > 0) {
      toast(`Sent to ${successCount}, failed for ${failCount}.`, 'warning');
    } else {
      toast('Failed to send emails.', 'error');
    }

    onSent();
    onClose();
  };

  const previewHtml = recipients.length > 0 ? getBodyHtml(recipients[0].fullName) : '';
  const emailTypeLabel = EMAIL_LABELS[getEmailType()] ?? getEmailType();

  return (
    <Modal open={open} onClose={onClose} title="Send Email to Applicants" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Recipients summary */}
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100">
          <p className="text-sm font-medium text-ocean-800">
            {recipients.length === 1
              ? `Sending to: ${recipients[0].fullName} (${recipients[0].email})`
              : `${recipients.length} recipients selected`}
          </p>
          {recipients.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recipients.slice(0, 5).map((r) => (
                <span key={r.userId} className="text-xs px-2 py-1 rounded-full bg-white border border-ocean-100 text-ocean-700">
                  {r.fullName}
                </span>
              ))}
              {recipients.length > 5 && (
                <span className="text-xs px-2 py-1 text-slate-500">+{recipients.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        {/* Template selector */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Email Template</label>
          <div className="grid grid-cols-2 gap-2">
            {MANUAL_EMAIL_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTemplate(t.key)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  template === t.key
                    ? 'bg-ocean-600 text-white border-ocean-600 shadow-sm'
                    : 'bg-white text-ocean-700 border-slate-200 hover:border-ocean-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="input-field"
          />
        </div>

        {/* Interview-specific fields */}
        {template === 'interview' && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Location / Meeting Link</label>
              <input type="text" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} placeholder="Office address or Zoom link" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Additional Notes</label>
              <textarea value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} placeholder="Extra instructions..." rows={2} className="input-field resize-none" />
            </div>
          </div>
        )}

        {/* Custom message */}
        {template === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your custom email message here... (HTML is supported)"
              rows={6}
              className="input-field resize-none font-mono text-sm"
            />
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Preview</span>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto bg-white">
              <p className="text-xs text-slate-400 mb-2">Type: {emailTypeLabel}</p>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        )}

        {/* Duplicate warning */}
        {duplicateWarning.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {duplicateWarning.length === 1
                    ? `${duplicateWarning[0]} already received this email recently.`
                    : `${duplicateWarning.length} applicants already received this email recently:`}
                </p>
                {duplicateWarning.length > 1 && (
                  <ul className="mt-1.5 text-sm text-amber-700 list-disc list-inside">
                    {duplicateWarning.slice(0, 5).map((n) => <li key={n}>{n}</li>)}
                  </ul>
                )}
                <p className="text-sm text-amber-700 mt-2">Send anyway?</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setDuplicateWarning([]); setConfirmOverride(false); }} className="px-4 py-2 rounded-lg bg-white border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => { setConfirmOverride(true); }} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors">
                    Send Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost flex items-center gap-2">
            <Eye className="w-4 h-4" /> {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (duplicateWarning.length > 0 && !confirmOverride)}
            className="flex-1 btn-gold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending to {recipients.length}...</> : <><Send className="w-4 h-4" /> Send to {recipients.length} {recipients.length > 1 ? 'Applicants' : 'Applicant'}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
