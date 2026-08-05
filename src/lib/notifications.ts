import { supabase } from './supabase';
import { sendNotificationEmail } from './email';

// ===== Types =====
export interface EmailDraft {
  id: string;
  admin_id: string;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string;
  body_html: string;
  email_type: string;
  metadata: Record<string, unknown> | null;
  attachment_urls: { name: string; url: string; size: number }[];
  status: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminNote {
  id: string;
  admin_id: string;
  user_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  admin_name?: string | null;
}

export interface AttachmentInfo {
  name: string;
  url: string;
  size: number;
}

// ===== Notification Templates =====
export interface NotificationTemplate {
  key: string;
  label: string;
  subject: string;
  emailType: string;
  hasSpecialFields?: 'interview' | 'flight' | 'job_offer' | null;
  bodyFn: (fullName: string, fields?: Record<string, string>) => string;
}

const wrapGreeting = (fullName: string) =>
  `<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Dear ${fullName},</p>`;
const wrapClosing = () =>
  `<p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6;">Best regards,<br><strong style="color:#0c4a6e;">Ocean Goers Recruitment Team</strong></p>`;

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    key: 'under_review',
    label: 'Application Under Review',
    subject: 'Your Application Is Under Review – Ocean Goers',
    emailType: 'application_under_review',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">We are pleased to inform you that your application is now under review by our recruitment team.</p><p style="color:#475569;font-size:15px;line-height:1.7;">We will contact you with updates regarding the next steps in the recruitment process.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please continue to check your dashboard regularly for updates.</p>${wrapClosing()}`,
  },
  {
    key: 'missing_documents',
    label: 'Missing Documents',
    subject: 'Action Required: Missing Documents – Ocean Goers',
    emailType: 'missing_documents',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Our review of your application has identified that some required documents are missing.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your dashboard and upload the following documents to proceed:</p><ul style="color:#475569;font-size:15px;line-height:1.8;padding-left:20px;"><li>Passport</li><li>CV / Resume</li><li>Passport-size Photo</li><li>Any other requested documents</li></ul><p style="color:#475569;font-size:15px;line-height:1.7;">If you have any questions, please do not hesitate to contact us.</p>${wrapClosing()}`,
  },
  {
    key: 'documents_approved',
    label: 'Documents Approved',
    subject: 'Documents Approved – Ocean Goers',
    emailType: 'documents_approved',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">We are pleased to confirm that all of your required documents have been reviewed and approved.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Your application will now proceed to the next stage of the recruitment process.</p>${wrapClosing()}`,
  },
  {
    key: 'registration_fee_request',
    label: 'Registration Fee Request',
    subject: 'Registration Fee Required – Ocean Goers',
    emailType: 'registration_fee_request',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Your application has reached the registration stage. To continue processing your application, a one-time registration fee is required.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your dashboard and navigate to the Payment Details section to complete your registration payment.</p>${wrapClosing()}`,
  },
  {
    key: 'registration_fee_confirmed',
    label: 'Registration Fee Confirmed',
    subject: 'Registration Fee Confirmed – Ocean Goers',
    emailType: 'registration_fee_confirmed',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">We are pleased to confirm that your registration fee payment has been received and verified.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Your application will now continue to the next stage of the recruitment process.</p>${wrapClosing()}`,
  },
  {
    key: 'interview_invitation',
    label: 'Interview Invitation',
    subject: 'Interview Invitation – Ocean Goers',
    emailType: 'interview_invitation',
    hasSpecialFields: 'interview',
    bodyFn: (n, f = {}) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Congratulations! You have been invited for an interview.</p><p style="color:#475569;font-size:15px;line-height:1.7;"><strong>Interview Date:</strong> ${f.date || 'TBD'}<br><strong>Interview Time:</strong> ${f.time || 'TBD'} ${f.timezone || ''}<br><strong>Location / Meeting Link:</strong> ${f.location || 'TBD'}</p>${f.notes ? `<p style="color:#475569;font-size:15px;line-height:1.7;"><strong>Additional Notes:</strong> ${f.notes}</p>` : ''}<p style="color:#475569;font-size:15px;line-height:1.7;">Please arrive on time and bring any requested documents.</p>${wrapClosing()}`,
  },
  {
    key: 'medical_examination',
    label: 'Medical Examination Request',
    subject: 'Medical Examination Required – Ocean Goers',
    emailType: 'medical_examination',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">As part of the recruitment process, you are required to complete a medical examination.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please visit an approved maritime medical examiner to complete your medical fitness assessment.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Once completed, please upload your medical certificate to your dashboard.</p>${wrapClosing()}`,
  },
  {
    key: 'visa_processing_started',
    label: 'Visa Processing Started',
    subject: 'Visa Processing Started – Ocean Goers',
    emailType: 'visa_processing_started',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">We are pleased to inform you that your visa processing has officially started.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Our team is working on your visa application and will keep you updated on the progress.</p><p style="color:#475569;font-size:15px;line-height:1.7;">If additional documents are required for the visa application, we will contact you.</p>${wrapClosing()}`,
  },
  {
    key: 'visa_approved',
    label: 'Visa Approved',
    subject: 'Visa Approved – Ocean Goers',
    emailType: 'visa_approved',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Congratulations! Your visa has been approved.</p><p style="color:#475569;font-size:15px;line-height:1.7;">This is a major milestone in your journey toward your cruise ship career.</p><p style="color:#475569;font-size:15px;line-height:1.7;">We will now proceed with the next steps of your deployment.</p>${wrapClosing()}`,
  },
  {
    key: 'job_offer',
    label: 'Job Offer',
    subject: 'Job Offer – Ocean Goers',
    emailType: 'job_offer',
    hasSpecialFields: 'job_offer',
    bodyFn: (n, f = {}) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Congratulations! We are delighted to present you with a job offer.</p><p style="color:#475569;font-size:15px;line-height:1.7;"><strong>Job Position:</strong> ${f.position || 'TBD'}<br><strong>Cruise Line:</strong> ${f.cruiseLine || 'TBD'}<br><strong>Ship Name:</strong> ${f.shipName || 'TBD'}<br><strong>Salary:</strong> ${f.salary || 'TBD'}<br><strong>Contract Length:</strong> ${f.contractLength || 'TBD'}<br><strong>Embarkation Date:</strong> ${f.embarkationDate || 'TBD'}</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please review the offer carefully and log in to your dashboard to accept.</p>${wrapClosing()}`,
  },
  {
    key: 'flight_details',
    label: 'Flight Details',
    subject: 'Flight Details – Ocean Goers',
    emailType: 'flight_details',
    hasSpecialFields: 'flight',
    bodyFn: (n, f = {}) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Your flight has been booked. Please find the details below:</p><p style="color:#475569;font-size:15px;line-height:1.7;"><strong>Airline:</strong> ${f.airline || 'TBD'}<br><strong>Flight Number:</strong> ${f.flightNumber || 'TBD'}<br><strong>Departure Airport:</strong> ${f.departureAirport || 'TBD'}<br><strong>Arrival Airport:</strong> ${f.arrivalAirport || 'TBD'}<br><strong>Departure Date:</strong> ${f.departureDate || 'TBD'}<br><strong>Departure Time:</strong> ${f.departureTime || 'TBD'}<br><strong>Arrival Date:</strong> ${f.arrivalDate || 'TBD'}<br><strong>Arrival Time:</strong> ${f.arrivalTime || 'TBD'}</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please arrive at the airport at least 3 hours before departure.</p>${wrapClosing()}`,
  },
  {
    key: 'joining_instructions',
    label: 'Joining Instructions',
    subject: 'Joining Instructions – Ocean Goers',
    emailType: 'joining_instructions',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">As your deployment date approaches, please review the following joining instructions:</p><ul style="color:#475569;font-size:15px;line-height:1.8;padding-left:20px;"><li>Bring all original documents with you</li><li>Arrive at the port on the designated date and time</li><li>Wear professional attire</li><li>Carry enough local currency for initial expenses</li></ul><p style="color:#475569;font-size:15px;line-height:1.7;">If you have any questions, please contact us.</p>${wrapClosing()}`,
  },
  {
    key: 'reminder',
    label: 'Reminder',
    subject: 'Reminder – Ocean Goers',
    emailType: 'reminder',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">This is a friendly reminder regarding your application with Ocean Goers.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your dashboard to check for any pending actions or updates.</p>${wrapClosing()}`,
  },
  {
    key: 'general_info',
    label: 'General Information',
    subject: 'Information Update – Ocean Goers',
    emailType: 'general_info',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">We would like to share an important update with you regarding your application.</p><p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your dashboard for more details.</p>${wrapClosing()}`,
  },
  {
    key: 'application_rejected',
    label: 'Application Rejected',
    subject: 'Application Status Update – Ocean Goers',
    emailType: 'application_rejected',
    bodyFn: (n) => `${wrapGreeting(n)}<p style="color:#475569;font-size:15px;line-height:1.7;">Thank you for applying through Ocean Goers Cruise Ship Recruitment Agency.</p><p style="color:#475569;font-size:15px;line-height:1.7;">After carefully reviewing your application, we are unable to continue with your application at this time.</p><p style="color:#475569;font-size:15px;line-height:1.7;">We appreciate your interest and encourage you to apply again in the future if you meet the required qualifications.</p>${wrapClosing()}`,
  },
  {
    key: 'custom',
    label: 'Custom Message',
    subject: '',
    emailType: 'custom_email',
    bodyFn: (n, f = {}) => `${wrapGreeting(n)}<div style="color:#475569;font-size:15px;line-height:1.7;">${f.message || ''}</div>${wrapClosing()}`,
  },
];

// ===== Draft CRUD =====
export async function fetchDrafts(adminId: string): Promise<EmailDraft[]> {
  const { data, error } = await supabase
    .from('email_drafts')
    .select('*')
    .eq('admin_id', adminId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data as EmailDraft[];
}

export async function saveDraft(params: {
  adminId: string;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
  subject: string;
  bodyHtml: string;
  emailType: string;
  metadata?: Record<string, unknown> | null;
  attachments?: AttachmentInfo[];
  status?: string;
  scheduledAt?: string | null;
  draftId?: string | null;
}): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const insert: Record<string, unknown> = {
    admin_id: params.adminId,
    recipient_user_id: params.recipientUserId ?? null,
    recipient_email: params.recipientEmail ?? null,
    recipient_name: params.recipientName ?? null,
    subject: params.subject,
    body_html: params.bodyHtml,
    email_type: params.emailType,
    metadata: params.metadata ?? null,
    attachment_urls: params.attachments ?? [],
    status: params.status ?? 'draft',
    scheduled_at: params.scheduledAt ?? null,
  };

  if (params.draftId) {
    const { error } = await supabase.from('email_drafts').update(insert).eq('id', params.draftId);
    if (error) return { success: false, error: error.message };
    return { success: true, draftId: params.draftId };
  }

  const { data, error } = await supabase.from('email_drafts').insert(insert).select('id').single();
  if (error) return { success: false, error: error.message };
  return { success: true, draftId: data.id };
}

export async function deleteDraft(draftId: string): Promise<boolean> {
  const { error } = await supabase.from('email_drafts').delete().eq('id', draftId);
  return !error;
}

// ===== Admin Notes =====
export async function fetchAdminNotes(userId: string): Promise<AdminNote[]> {
  const { data, error } = await supabase
    .from('admin_notes')
    .select('id, admin_id, user_id, note, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as AdminNote[];
}

export async function addAdminNote(adminId: string, userId: string, note: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('admin_notes').insert({ admin_id: adminId, user_id: userId, note });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateAdminNote(noteId: string, note: string): Promise<boolean> {
  const { error } = await supabase.from('admin_notes').update({ note }).eq('id', noteId);
  return !error;
}

export async function deleteAdminNote(noteId: string): Promise<boolean> {
  const { error } = await supabase.from('admin_notes').delete().eq('id', noteId);
  return !error;
}

// ===== Attachments =====
export async function uploadAttachment(file: File, adminId: string): Promise<{ url: string; name: string; size: number } | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${adminId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(fileName, file, { upsert: false });
  if (error) return null;
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
  return { url: urlData.publicUrl, name: file.name, size: file.size };
}

// ===== Send Notification =====
export async function sendManualNotification(params: {
  userId: string;
  emailTo: string;
  recipientName: string;
  emailType: string;
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, unknown>;
  sentBy?: string | null;
  adminName?: string | null;
  attachments?: AttachmentInfo[];
  forceResend?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const res = await sendNotificationEmail({
    userId: params.userId,
    emailTo: params.emailTo,
    recipientName: params.recipientName,
    emailType: params.emailType,
    subject: params.subject,
    bodyHtml: params.bodyHtml,
    metadata: { ...params.metadata, attachments: params.attachments, admin_name: params.adminName },
    forceResend: params.forceResend ?? true,
    sentBy: params.sentBy ?? null,
  });
  return res;
}

// ===== Bulk Send =====
export async function sendBulkNotification(params: {
  recipients: { userId: string; email: string; fullName: string }[];
  emailType: string;
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, unknown>;
  sentBy?: string | null;
  adminName?: string | null;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const r of params.recipients) {
    const res = await sendManualNotification({
      userId: r.userId,
      emailTo: r.email,
      recipientName: r.fullName,
      emailType: params.emailType,
      subject: params.subject,
      bodyHtml: params.bodyHtml,
      metadata: params.metadata,
      sentBy: params.sentBy,
      adminName: params.adminName,
    });
    if (res.success) sent++;
    else failed++;
  }
  return { sent, failed };
}
