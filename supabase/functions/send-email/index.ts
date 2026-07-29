import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Ocean Goers Recruitment <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface SendEmailPayload {
  userId: string;
  emailTo: string;
  recipientName: string;
  emailType: string;
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, unknown> | null;
  forceResend?: boolean;
}

async function supabaseRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return null;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Resend API error ${res.status}: ${text}` };
  }

  return { success: true };
}

async function logEmail(
  userId: string,
  emailTo: string,
  recipientName: string,
  emailType: string,
  subject: string,
  bodyHtml: string,
  status: string,
  errorMessage: string | null,
  metadata: Record<string, unknown> | null,
) {
  await supabaseRequest("email_log", "POST", {
    user_id: userId,
    email_to: emailTo,
    recipient_name: recipientName,
    email_type: emailType,
    subject,
    body_html: bodyHtml,
    status,
    error_message: errorMessage,
    metadata,
  });
}

async function checkDuplicate(userId: string, emailType: string): Promise<boolean> {
  const result = await supabaseRequest(
    `email_log?user_id=eq.${encodeURIComponent(userId)}&email_type=eq.${encodeURIComponent(emailType)}&status=eq.sent&select=id&limit=1`,
    "GET",
  );
  return Array.isArray(result) && result.length > 0;
}

async function getEmailLogById(id: string) {
  const result = await supabaseRequest(
    `email_log?id=eq.${encodeURIComponent(id)}&select=*`,
    "GET",
  );
  return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const resendId = url.searchParams.get("resend");

    // Resend mode: re-send an existing email log entry
    if (resendId) {
      const log = await getEmailLogById(resendId);
      if (!log) {
        return new Response(JSON.stringify({ success: false, error: "Email log not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sendResult = await sendViaResend(log.email_to, log.subject, log.body_html);
      const newStatus = sendResult.success ? "sent" : "failed";

      await logEmail(
        log.user_id,
        log.email_to,
        log.recipient_name ?? "Applicant",
        log.email_type,
        log.subject,
        log.body_html,
        newStatus,
        sendResult.error ?? null,
        { ...((log.metadata as Record<string, unknown> | null) ?? {}), resent_from: log.id },
      );

      if (!sendResult.success) {
        return new Response(JSON.stringify({ success: false, error: sendResult.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normal send mode
    const payload: SendEmailPayload = await req.json();

    if (!payload.emailTo || !payload.emailType || !payload.subject || !payload.bodyHtml) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate prevention (skip if forceResend)
    if (!payload.forceResend) {
      const alreadySent = await checkDuplicate(payload.userId, payload.emailType);
      if (alreadySent) {
        return new Response(JSON.stringify({ success: true, message: "Email already sent previously, skipping duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const sendResult = await sendViaResend(payload.emailTo, payload.subject, payload.bodyHtml);
    const status = sendResult.success ? "sent" : "failed";

    await logEmail(
      payload.userId,
      payload.emailTo,
      payload.recipientName,
      payload.emailType,
      payload.subject,
      payload.bodyHtml,
      status,
      sendResult.error ?? null,
      payload.metadata ?? null,
    );

    if (!sendResult.success) {
      return new Response(JSON.stringify({ success: false, error: sendResult.error }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
