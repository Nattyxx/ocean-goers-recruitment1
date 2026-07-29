import { supabase } from './supabase';

const SITE_URL = 'https://ocean-goers-recruitm-hblk.bolt.host';
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/send-email`;

export const EMAIL_LABELS: Record<string, string> = {
  application_submitted: 'Application Submitted',
  payment_required: 'Payment Required',
  payment_confirmed: 'Payment Confirmed',
  application_approved: 'Application Approved',
  application_rejected: 'Application Rejected',
  interview_invitation: 'Interview Invitation',
};

export interface EmailLogRow {
  id: string;
  user_id: string;
  email_to: string;
  recipient_name: string | null;
  email_type: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  metadata: Record<string, unknown> | null;
}

interface SendEmailParams {
  userId: string;
  emailTo: string;
  recipientName: string;
  emailType: string;
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, unknown>;
  forceResend?: boolean;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

function wrapEmailTemplate(recipientName: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ocean Goers Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 50%,#0284c7 100%);padding:32px 40px;text-align:center;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">Ocean Goers</h1>
<p style="margin:4px 0 0;color:#bae6fd;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Cruise Ship Recruitment Agency</p>
</td></tr></table>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:36px 40px;">
<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Dear ${recipientName},</p>
<div style="color:#475569;font-size:15px;line-height:1.7;">
${bodyHtml}
</div>
<p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6;">Regards,<br><strong style="color:#0c4a6e;">Ocean Goers Recruitment Team</strong></p>
</td>
</tr>

<!-- Button -->
<tr>
<td style="padding:0 40px 36px;text-align:center;">
<a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1e1b0a;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">Visit Your Account</a>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
<p style="margin:0;text-align:center;color:#94a3b8;font-size:12px;line-height:1.5;">This is an automated message from Ocean Goers Cruise Ship Recruitment Agency.<br>Please do not reply to this email.</p>
<p style="margin:8px 0 0;text-align:center;"><a href="${SITE_URL}" style="color:#0369a1;font-size:12px;text-decoration:none;">${SITE_URL}</a></p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendNotificationEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        userId: params.userId,
        emailTo: params.emailTo,
        recipientName: params.recipientName,
        emailType: params.emailType,
        subject: params.subject,
        bodyHtml: wrapEmailTemplate(params.recipientName, params.bodyHtml),
        metadata: params.metadata ?? null,
        forceResend: params.forceResend ?? false,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data?.error ?? 'Failed to send email.' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error sending email.' };
  }
}

export async function hasEmailBeenSent(userId: string, emailType: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_log')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .eq('status', 'sent')
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function fetchEmailLogs(): Promise<EmailLogRow[]> {
  const { data, error } = await supabase
    .from('email_log')
    .select('id, user_id, email_to, recipient_name, email_type, subject, status, error_message, sent_at, metadata')
    .order('sent_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return (data as EmailLogRow[]) ?? [];
}

export async function resendEmail(logId: string): Promise<SendEmailResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;

    const response = await fetch(`${EDGE_FUNCTION_URL}?resend=${encodeURIComponent(logId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data?.error ?? 'Failed to resend email.' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error resending email.' };
  }
}
