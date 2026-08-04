import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Ocean Goers Recruitment <noreply@oceangoers.org>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL = "https://ocean-goers-recruitm-hblk.bolt.host";

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const REQUIRED_DOC_KEYS = ["passport", "cv"];

// ── Email templates ──────────────────────────────────────────────────────────

function emailShell(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ocean Goers Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
<tr>
<td style="background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 50%,#0284c7 100%);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">Ocean Goers</h1>
<p style="margin:4px 0 0;color:#bae6fd;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Cruise Ship Recruitment Agency</p>
</td>
</tr>
<tr>
<td style="padding:36px 40px;">
${innerHtml}
</td>
</tr>
<tr>
<td style="padding:0 40px 36px;text-align:center;">
<a href="${SITE_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1e1b0a;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">Go to Dashboard</a>
</td>
</tr>
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

function documentsReminderHtml(fullName: string): string {
  return emailShell(`
<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Hello ${fullName},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Thank you for applying through Ocean Goers Cruise Recruitment.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Your application has been received successfully. However, your application is still incomplete because the required documents have not yet been uploaded.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your account and upload all required documents to continue your recruitment process.</p>
<p style="margin:20px 0 8px;color:#0c4a6e;font-size:15px;font-weight:700;">Required Documents:</p>
<ul style="color:#475569;font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 20px;">
<li>Passport</li>
<li>CV / Resume</li>
<li>Passport-size Photo</li>
<li>Seaman Book (if available)</li>
<li>Certificates (if applicable)</li>
<li>Any other required documents</li>
</ul>
<p style="color:#475569;font-size:15px;line-height:1.7;">Uploading your documents allows our recruitment team to begin reviewing your application.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">If you need assistance, please contact us.</p>
<p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6;">Best regards,<br><strong style="color:#0c4a6e;">Ocean Goers Cruise Recruitment</strong></p>
`);
}

function documentsReceivedHtml(fullName: string): string {
  return emailShell(`
<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Hello ${fullName},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Great news!</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">We have successfully received all of your required documents. Your application has now moved to the next stage.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">The next step is to complete your <strong>Registration Payment</strong>.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your dashboard and proceed to the Payment Details section.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">After payment is confirmed, our recruitment team will continue processing your application.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Thank you for choosing Ocean Goers Cruise Recruitment.</p>
<p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6;">Best regards,<br><strong style="color:#0c4a6e;">Ocean Goers Cruise Recruitment</strong></p>
`);
}

function paymentReminderHtml(fullName: string): string {
  return emailShell(`
<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Hello ${fullName},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">This is a friendly reminder that your registration payment has not yet been completed.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Your documents have been received, but the registration fee of <strong>$90 USD</strong> is still pending.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Please log in to your dashboard and complete the payment to proceed with your application.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Once payment is confirmed, our recruitment team will continue processing your application.</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">If you need assistance, please contact us.</p>
<p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6;">Best regards,<br><strong style="color:#0c4a6e;">Ocean Goers Cruise Recruitment</strong></p>
`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendViaResend(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { success: false, error: "RESEND_API_KEY not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Resend API error ${res.status}: ${text}` };
  }
  return { success: true };
}

async function logAndSend(
  userId: string,
  emailTo: string,
  recipientName: string,
  emailType: string,
  subject: string,
  bodyHtml: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  // Check for duplicate (sent status only)
  const { data: existing } = await adminClient
    .from("email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .eq("status", "sent")
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true };
  }

  // Delete any prior failed attempt of this type so we can insert a fresh log
  await adminClient
    .from("email_log")
    .delete()
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .eq("status", "failed");

  const sendResult = await sendViaResend(emailTo, subject, bodyHtml);

  await adminClient.from("email_log").insert({
    user_id: userId,
    email_to: emailTo,
    recipient_name: recipientName,
    email_type: emailType,
    subject,
    body_html: bodyHtml,
    status: sendResult.success ? "sent" : "failed",
    error_message: sendResult.error ?? null,
    metadata: metadata ?? null,
    sent_at: new Date().toISOString(),
  });

  return sendResult;
}

async function retryFailedEmails(): Promise<number> {
  const { data: failed } = await adminClient
    .from("email_log")
    .select("id, user_id, email_to, recipient_name, email_type, subject, body_html, metadata")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!failed || failed.length === 0) return 0;

  let retried = 0;
  for (const log of failed) {
    const sendResult = await sendViaResend(log.email_to, log.subject, log.body_html);
    if (sendResult.success) {
      await adminClient.from("email_log").update({ status: "sent", error_message: null, sent_at: new Date().toISOString() }).eq("id", log.id);
      retried++;
    }
  }
  return retried;
}

// ── Main reminder logic ───────────────────────────────────────────────────────

interface AppRow {
  id: string;
  user_id: string;
  position: string | null;
  status: string;
  current_step: number;
  submitted_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

async function processDocumentReminders(): Promise<number> {
  // Find applications at step 3 (documents pending) that were submitted > 24h ago
  const { data: apps } = await adminClient
    .from("applications")
    .select("id, user_id, position, status, current_step, submitted_at, updated_at")
    .eq("current_step", 3)
    .neq("status", "Rejected")
    .neq("status", "Approved");

  if (!apps || apps.length === 0) return 0;

  const now = Date.now();
  let sent = 0;

  for (const app of apps as AppRow[]) {
    const submittedMs = new Date(app.submitted_at).getTime();
    const elapsedHours = (now - submittedMs) / (1000 * 60 * 60);

    // Determine which reminder tier applies
    let emailType: string | null = null;
    if (elapsedHours >= 168) emailType = "documents_reminder_7d";
    else if (elapsedHours >= 72) emailType = "documents_reminder_3d";
    else if (elapsedHours >= 24) emailType = "documents_reminder_24h";

    if (!emailType) continue;

    // Check if docs were uploaded — if so, skip (stop reminders)
    const { data: docs } = await adminClient
      .from("documents")
      .select("doc_type")
      .eq("user_id", app.user_id);

    const docTypes = new Set((docs ?? []).map((d: { doc_type: string }) => d.doc_type));
    const hasRequiredDocs = REQUIRED_DOC_KEYS.every((k) => docTypes.has(k));

    if (hasRequiredDocs) continue; // docs uploaded — stop reminders

    // Get profile for email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", app.user_id)
      .maybeSingle() as { data: ProfileRow | null };

    if (!profile?.email) continue;

    const subject = "Complete Your Ocean Goers Application – Upload Your Documents";
    const html = documentsReminderHtml(profile.full_name ?? "Applicant");

    const result = await logAndSend(app.user_id, profile.email, profile.full_name ?? "Applicant", emailType, subject, html, { reminder_tier: emailType });
    if (result.success) sent++;
  }

  return sent;
}

async function processPaymentReminders(): Promise<number> {
  // Find applications at step 4 (documents uploaded, awaiting payment)
  const { data: apps } = await adminClient
    .from("applications")
    .select("id, user_id, position, status, current_step, submitted_at, updated_at")
    .eq("current_step", 4)
    .neq("status", "Rejected")
    .neq("status", "Approved");

  if (!apps || apps.length === 0) return 0;

  const now = Date.now();
  let sent = 0;

  for (const app of apps as AppRow[]) {
    // Use updated_at as the moment docs were completed / step moved to 4
    const stepMs = new Date(app.updated_at).getTime();
    const elapsedHours = (now - stepMs) / (1000 * 60 * 60);

    let emailType: string | null = null;
    if (elapsedHours >= 168) emailType = "payment_reminder_7d";
    else if (elapsedHours >= 72) emailType = "payment_reminder_3d";
    else if (elapsedHours >= 24) emailType = "payment_reminder_24h";

    if (!emailType) continue;

    // Check if payment was already made — if so, skip
    const { data: payments } = await adminClient
      .from("payments")
      .select("id, status")
      .eq("application_id", app.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const hasPayment = (payments ?? []).some((p: { status: string }) => p.status === "Verified" || p.status === "Pending");

    // Also check crypto payments
    const { data: cryptoPays } = await adminClient
      .from("crypto_payments")
      .select("id, status")
      .eq("user_id", app.user_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const hasCryptoPayment = (cryptoPays ?? []).some((c: { status: string }) => {
      const s = c.status.toLowerCase();
      return s === "confirmed" || s === "finished" || s === "waiting" || s === "confirming";
    });

    if (hasPayment || hasCryptoPayment) continue;

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", app.user_id)
      .maybeSingle() as { data: ProfileRow | null };

    if (!profile?.email) continue;

    const subject = "Registration Payment Reminder – Ocean Goers";
    const html = paymentReminderHtml(profile.full_name ?? "Applicant");

    const result = await logAndSend(app.user_id, profile.email, profile.full_name ?? "Applicant", emailType, subject, html, { reminder_tier: emailType });
    if (result.success) sent++;
  }

  return sent;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const [docSent, paySent, retried] = await Promise.all([
      processDocumentReminders(),
      processPaymentReminders(),
      retryFailedEmails(),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        documentRemindersSent: docSent,
        paymentRemindersSent: paySent,
        failedRetried: retried,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
