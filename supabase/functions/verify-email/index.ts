import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Ocean Goers Recruitment <onboarding@resend.dev>";
const SITE_URL = "https://ocean-goers-recruitm-hblk.bolt.host";

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function verificationEmailHtml(recipientName: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Verify Your Email</title>
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
<p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.6;">Dear ${recipientName},</p>
<p style="color:#475569;font-size:15px;line-height:1.7;">Thank you for registering with Ocean Goers. To complete your account creation, please use the verification code below:</p>
<div style="margin:28px 0;text-align:center;">
<div style="display:inline-block;background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:14px;padding:24px 48px;">
<p style="margin:0;color:#bae6fd;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Verification Code</p>
<p style="margin:8px 0 0;color:#ffffff;font-size:40px;font-weight:800;letter-spacing:10px;">${code}</p>
</div>
</div>
<p style="color:#475569;font-size:14px;line-height:1.7;text-align:center;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
<p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
<p style="margin:16px 0 0;color:#475569;font-size:15px;line-height:1.6;">Regards,<br><strong style="color:#0c4a6e;">Ocean Goers Recruitment Team</strong></p>
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

async function sendVerificationEmail(to: string, name: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { success: false, error: "RESEND_API_KEY not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "Your Ocean Goers Verification Code",
      html: verificationEmailHtml(name, code),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Resend error ${res.status}: ${text}` };
  }
  return { success: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, email, fullName, password, code } = await req.json();

    // ── ACTION: initiate ──────────────────────────────────────────────────────
    // Called when user submits the signup form.
    // Upserts a pending_registrations row and emails a fresh code.
    if (action === "initiate") {
      if (!email || !fullName || !password) {
        return new Response(JSON.stringify({ success: false, error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this email already has a confirmed Supabase auth account
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const alreadyExists = existingUsers?.users?.some(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (alreadyExists) {
        return new Response(JSON.stringify({ success: false, error: "An account with this email already exists. Please sign in." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Upsert — replaces any prior pending row for this email
      const { error: upsertError } = await adminClient
        .from("pending_registrations")
        .upsert({ email: email.toLowerCase(), full_name: fullName, password_plain: password, code: newCode, expires_at: expiresAt }, { onConflict: "email" });

      if (upsertError) {
        return new Response(JSON.stringify({ success: false, error: upsertError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sendResult = await sendVerificationEmail(email, fullName, newCode);
      if (!sendResult.success) {
        // Clean up pending row so the user can try again
        await adminClient.from("pending_registrations").delete().eq("email", email.toLowerCase());
        return new Response(JSON.stringify({ success: false, error: sendResult.error ?? "Failed to send verification email." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: resend ────────────────────────────────────────────────────────
    // Generates a fresh code for an existing pending row and emails it.
    if (action === "resend") {
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: "Missing email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pending, error: fetchErr } = await adminClient
        .from("pending_registrations")
        .select("full_name")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (fetchErr || !pending) {
        return new Response(JSON.stringify({ success: false, error: "No pending registration found. Please start over." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await adminClient
        .from("pending_registrations")
        .update({ code: newCode, expires_at: expiresAt })
        .eq("email", email.toLowerCase());

      const sendResult = await sendVerificationEmail(email, pending.full_name, newCode);
      if (!sendResult.success) {
        return new Response(JSON.stringify({ success: false, error: sendResult.error ?? "Failed to resend email." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: verify ────────────────────────────────────────────────────────
    // Validates the OTP and creates the Supabase auth user on success.
    if (action === "verify") {
      if (!email || !code) {
        return new Response(JSON.stringify({ success: false, error: "Missing email or code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pending, error: fetchErr } = await adminClient
        .from("pending_registrations")
        .select("*")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (fetchErr || !pending) {
        return new Response(JSON.stringify({ success: false, error: "No pending registration found. Please start over." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(pending.expires_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: "expired" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check code
      if (pending.code !== String(code).trim()) {
        return new Response(JSON.stringify({ success: false, error: "incorrect_code" }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the auth user — email_confirm = true so they can sign in immediately
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: pending.email,
        password: pending.password_plain,
        user_metadata: { full_name: pending.full_name },
        email_confirm: true,
      });

      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ success: false, error: createErr?.message ?? "Failed to create account." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete the pending row
      await adminClient.from("pending_registrations").delete().eq("email", pending.email);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
