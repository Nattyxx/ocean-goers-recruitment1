import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RAMPEX_API_KEY = Deno.env.get("Rampex_API_Secret") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EXPECTED_AMOUNT = 90;
const EXPECTED_CURRENCY = "USD";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!RAMPEX_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Rampex API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's JWT and get their identity
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userData = await userRes.json() as {
      id: string;
      email: string;
      user_metadata?: Record<string, unknown>;
    };

    const userId = userData.id;
    const userEmail = userData.email ?? "";

    // Fetch the user's profile (full_name, phone)
    const profileRes = await supabaseRequest(
      `profiles?id=eq.${encodeURIComponent(userId)}&select=full_name,phone`,
      "GET",
    ) as Array<{ full_name: string | null; phone: string | null }> | null;

    const profile = profileRes?.[0] ?? null;
    const fullName = profile?.full_name ?? (userData.user_metadata?.full_name as string) ?? "";

    // Fetch the user's most recent application
    const appRes = await supabaseRequest(
      `applications?user_id=eq.${encodeURIComponent(userId)}&order=submitted_at.desc&limit=1&select=id,user_id`,
      "GET",
    ) as Array<{ id: string; user_id: string }> | null;

    if (!appRes || appRes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No application found. Please submit an application first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const applicationId = appRes[0].id;

    // Parse optional body for customer details (frontend may send name/email/phone)
    let bodyData: { name?: string; email?: string; phone?: string } = {};
    try {
      if (req.body) {
        bodyData = await req.json() as { name?: string; email?: string; phone?: string };
      }
    } catch {
      // empty body is fine
    }

    const customerName = bodyData.name?.trim() || fullName || "Ocean Goers Applicant";
    const customerEmail = bodyData.email?.trim() || userEmail;
    const customerPhone = bodyData.phone?.trim() || profile?.phone || "";

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Customer email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create a unique internal order ID
    const timestamp = Date.now();
    const internalOrderId = `OG-${applicationId.slice(0, 8)}-${timestamp}`;

    // Insert a pending rampex_payments record BEFORE calling Rampex
    const insertBody: Record<string, unknown> = {
      user_id: userId,
      application_id: applicationId,
      provider: "rampex",
      status: "pending",
      verified: false,
      amount: EXPECTED_AMOUNT,
      currency: EXPECTED_CURRENCY,
      customer_email: customerEmail,
      applicant_name: customerName,
      phone: customerPhone || null,
      internal_order_id: internalOrderId,
      event: null,
      description: `Ocean Goers Service Fee - ${internalOrderId}`,
    };

    const inserted = await supabaseRequest("rampex_payments", "POST", insertBody) as
      | Array<Record<string, unknown>>
      | null;

    const paymentRecordId = inserted?.[0]?.id as string | undefined;

    // Call Rampex API to create a payment link
    const rampexRes = await fetch("https://api.rampex.io/api-create-payment-link", {
      method: "POST",
      headers: {
        "X-API-Key": RAMPEX_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: EXPECTED_AMOUNT,
        currency: EXPECTED_CURRENCY,
        customer_email: customerEmail,
        description: `Ocean Goers Service Fee - ${internalOrderId}`,
      }),
    });

    if (!rampexRes.ok) {
      const errText = await rampexRes.text();
      // Update the record to reflect the error
      if (paymentRecordId) {
        await supabaseRequest(
          `rampex_payments?id=eq.${encodeURIComponent(paymentRecordId)}`,
          "PATCH",
          { status: "creation_failed" },
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to create Rampex payment link" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rampexData = await rampexRes.json() as {
      link_id?: string;
      payment_link_id?: string;
      payment_url?: string;
      url?: string;
      payment_link?: string;
      link?: string;
    };

    const linkId = rampexData.link_id ?? rampexData.payment_link_id ?? "";
    const paymentUrl = rampexData.payment_url ?? rampexData.url ?? rampexData.payment_link ?? rampexData.link ?? "";

    if (!linkId || !paymentUrl) {
      if (paymentRecordId) {
        await supabaseRequest(
          `rampex_payments?id=eq.${encodeURIComponent(paymentRecordId)}`,
          "PATCH",
          { status: "creation_failed" },
        );
      }
      return new Response(
        JSON.stringify({ error: "Rampex did not return a valid payment link" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the record with the Rampex link_id and payment URL
    await supabaseRequest(
      `rampex_payments?id=eq.${encodeURIComponent(paymentRecordId)}`,
      "PATCH",
      {
        link_id: linkId,
        payment_url: paymentUrl,
      },
    );

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl,
        linkId,
        paymentId: paymentRecordId ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
