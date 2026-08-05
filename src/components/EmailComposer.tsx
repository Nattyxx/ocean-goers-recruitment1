import { useState, useEffect, useMemo } from 'react';
import { Loader2, Send, Save, Eye, Paperclip, X, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { RichTextEditor } from './ui/RichTextEditor';
import { useToast } from '../lib/toast';
import {
  NOTIFICATION_TEMPLATES, saveDraft, uploadAttachment,
  sendManualNotification, type NotificationTemplate, type AttachmentInfo,
} from '../lib/notifications';

interface ApplicantRecipient {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface EmailComposerProps {
  recipient: ApplicantRecipient | null;
  adminId: string;
  adminName: string | null;
  onClose: () => void;
  onSent: () => void;
  onDraftSaved?: () => void;
}

export function EmailComposer({ recipient, adminId, adminName, onClose, onSent, onDraftSaved }: EmailComposerProps) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<NotificationTemplate>(NOTIFICATION_TEMPLATES[0]);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  // Specialized fields
  const [interviewFields, setInterviewFields] = useState({ date: '', time: '', timezone: '', location: '', notes: '' });
  const [flightFields, setFlightFields] = useState({
    airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '',
    departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '',
  });
  const [jobOfferFields, setJobOfferFields] = useState({
    position: '', cruiseLine: '', salary: '', contractLength: '', shipName: '', embarkationDate: '',
  });

  const recipientName = recipient?.full_name ?? 'Applicant';

  useEffect(() => {
    setSubject(template.subject);
    updateBody();
  }, [template]);

  const updateBody = () => {
    const fields = getSpecialFields();
    setBodyHtml(template.bodyFn(recipientName, fields));
  };

  const getSpecialFields = (): Record<string, string> => {
    if (template.hasSpecialFields === 'interview') return interviewFields;
    if (template.hasSpecialFields === 'flight') return flightFields;
    if (template.hasSpecialFields === 'job_offer') return jobOfferFields;
    return {};
  };

  // Re-generate body when specialized fields change
  useEffect(() => {
    if (template.hasSpecialFields) updateBody();
  }, [interviewFields, flightFields, jobOfferFields]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const result = await uploadAttachment(file, adminId);
      if (result) {
        setAttachments((prev) => [...prev, result]);
      } else {
        toast(`Failed to upload ${file.name}.`, 'error');
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!recipient?.email) { toast('No recipient email address.', 'error'); return; }
    if (!subject.trim()) { toast('Subject is required.', 'error'); return; }
    if (!bodyHtml.trim()) { toast('Message is required.', 'error'); return; }

    setSending(true);
    const fields = getSpecialFields();
    const result = await sendManualNotification({
      userId: recipient.user_id,
      emailTo: recipient.email,
      recipientName: recipientName,
      emailType: template.emailType,
      subject,
      bodyHtml,
      metadata: { ...fields, template: template.key },
      sentBy: adminId,
      adminName,
      attachments,
      forceResend: true,
    });
    setSending(false);

    if (result.success) {
      toast('Notification sent successfully!', 'success');
      onSent();
    } else {
      toast(result.error ?? 'Failed to send notification.', 'error');
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() && !bodyHtml.trim()) { toast('Nothing to save.', 'error'); return; }
    setSavingDraft(true);
    const result = await saveDraft({
      adminId,
      recipientUserId: recipient?.user_id ?? null,
      recipientEmail: recipient?.email ?? null,
      recipientName: recipient?.full_name ?? null,
      subject,
      bodyHtml,
      emailType: template.emailType,
      metadata: { ...getSpecialFields(), template: template.key },
      attachments,
      status: scheduleAt ? 'scheduled' : 'draft',
      scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
    });
    setSavingDraft(false);

    if (result.success) {
      toast(scheduleAt ? 'Email scheduled!' : 'Draft saved!', 'success');
      onDraftSaved?.();
      onClose();
    } else {
      toast(result.error ?? 'Failed to save draft.', 'error');
    }
  };

  const showSpecialFields = template.hasSpecialFields;

  return (
    <Modal open={true} onClose={onClose} title="Send Notification" maxWidth="max-w-3xl">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Recipient */}
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100">
          <p className="text-sm font-medium text-ocean-800">
            {recipient ? `To: ${recipient.full_name} (${recipient.email})` : 'No recipient selected'}
          </p>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Email Template</label>
          <select
            value={template.key}
            onChange={(e) => setTemplate(NOTIFICATION_TEMPLATES.find((t) => t.key === e.target.value)!)}
            className="input-field text-sm"
          >
            {NOTIFICATION_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {/* Specialized Fields */}
        {showSpecialFields === 'interview' && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Interview Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input type="date" value={interviewFields.date} onChange={(e) => setInterviewFields({ ...interviewFields, date: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                <input type="time" value={interviewFields.time} onChange={(e) => setInterviewFields({ ...interviewFields, time: e.target.value })} className="input-field text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Time Zone</label>
              <input type="text" value={interviewFields.timezone} onChange={(e) => setInterviewFields({ ...interviewFields, timezone: e.target.value })} placeholder="e.g. GMT+4, EST" className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Meeting Link / Office Address</label>
              <input type="text" value={interviewFields.location} onChange={(e) => setInterviewFields({ ...interviewFields, location: e.target.value })} placeholder="Zoom link or office address" className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Additional Notes</label>
              <textarea value={interviewFields.notes} onChange={(e) => setInterviewFields({ ...interviewFields, notes: e.target.value })} rows={2} className="input-field text-sm resize-none" />
            </div>
          </div>
        )}

        {showSpecialFields === 'flight' && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Flight Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Airline</label>
                <input type="text" value={flightFields.airline} onChange={(e) => setFlightFields({ ...flightFields, airline: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Flight Number</label>
                <input type="text" value={flightFields.flightNumber} onChange={(e) => setFlightFields({ ...flightFields, flightNumber: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departure Airport</label>
                <input type="text" value={flightFields.departureAirport} onChange={(e) => setFlightFields({ ...flightFields, departureAirport: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arrival Airport</label>
                <input type="text" value={flightFields.arrivalAirport} onChange={(e) => setFlightFields({ ...flightFields, arrivalAirport: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departure Date</label>
                <input type="date" value={flightFields.departureDate} onChange={(e) => setFlightFields({ ...flightFields, departureDate: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departure Time</label>
                <input type="time" value={flightFields.departureTime} onChange={(e) => setFlightFields({ ...flightFields, departureTime: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arrival Date</label>
                <input type="date" value={flightFields.arrivalDate} onChange={(e) => setFlightFields({ ...flightFields, arrivalDate: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arrival Time</label>
                <input type="time" value={flightFields.arrivalTime} onChange={(e) => setFlightFields({ ...flightFields, arrivalTime: e.target.value })} className="input-field text-sm" />
              </div>
            </div>
          </div>
        )}

        {showSpecialFields === 'job_offer' && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Job Offer Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Job Position</label>
                <input type="text" value={jobOfferFields.position} onChange={(e) => setJobOfferFields({ ...jobOfferFields, position: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cruise Line</label>
                <input type="text" value={jobOfferFields.cruiseLine} onChange={(e) => setJobOfferFields({ ...jobOfferFields, cruiseLine: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Salary</label>
                <input type="text" value={jobOfferFields.salary} onChange={(e) => setJobOfferFields({ ...jobOfferFields, salary: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contract Length</label>
                <input type="text" value={jobOfferFields.contractLength} onChange={(e) => setJobOfferFields({ ...jobOfferFields, contractLength: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ship Name</label>
                <input type="text" value={jobOfferFields.shipName} onChange={(e) => setJobOfferFields({ ...jobOfferFields, shipName: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Embarkation Date</label>
                <input type="date" value={jobOfferFields.embarkationDate} onChange={(e) => setJobOfferFields({ ...jobOfferFields, embarkationDate: e.target.value })} className="input-field text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." className="input-field text-sm" />
        </div>

        {/* Rich Text Editor */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Message</label>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write your email message..." />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Attachments</label>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-ocean-700 text-sm font-medium hover:border-ocean-300 transition-colors cursor-pointer">
              <Paperclip className="w-4 h-4" /> Upload File
              <input type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
            </label>
            {uploading && <Loader2 className="w-4 h-4 text-ocean-500 animate-spin" />}
          </div>
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-ocean-700 hover:underline truncate">{att.name}</a>
                    <span className="text-xs text-slate-400 flex-shrink-0">({(att.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => removeAttachment(i)} className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Schedule (optional — leave empty to send now)</label>
          <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="input-field text-sm" />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Preview</span>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto bg-white">
              <p className="text-sm font-semibold text-ocean-900 mb-2">Subject: {subject}</p>
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 sticky bottom-0 bg-white pb-1 pt-2">
          <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost text-ocean-700 border-slate-200 text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" /> {showPreview ? 'Hide' : 'Preview'}
          </button>
          <button onClick={handleSaveDraft} disabled={savingDraft} className="btn-ghost text-ocean-700 border-slate-200 text-sm flex items-center gap-2 disabled:opacity-50">
            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Draft</>}
          </button>
          <button onClick={handleSend} disabled={sending || !recipient?.email} className="flex-1 btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Now</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
