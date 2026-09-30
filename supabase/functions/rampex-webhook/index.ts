import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RAMPEX_WEBHOOK_SECRET = Deno.env.get("RAMPEX_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EXPECTED_AMOUNT = 90;

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

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function hexToBytes(hex: string): Promise<Uint8Array> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifyRampexSignature(req: Request): Promise<{ valid: boolean; body: string }> {
  const bodyText = await req.text();

  if (!RAMPEX_WEBHOOK_SECRET) {
    return { valid: false, body: bodyText };
  }

  const signatureHeader =
    req.headers.get("x-rampex-signature") ??
    req.headers.get("x-webhook-signature") ??
    "";
  if (!signatureHeader) {
    return { valid: false, body: bodyText };
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RAMPEX_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyText));
  const expectedBytes = new Uint8Array(sig);

  let receivedBytes: Uint8Array;
  try {
    receivedBytes = await hexToBytes(signatureHeader);
  } catch {
    return { valid: false, body: bodyText };
  }

  const valid = timingSafeEqual(expectedBytes, receivedBytes);
  return { valid, body: bodyText };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { valid, body } = await verifyRampexSignature(req);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event =
      String(req.headers.get("x-rampex-event") ?? payload.event ?? "").toLowerCase();

    if (event !== "payment.completed") {
      return new Response(
        JSON.stringify({ success: true, message: `Ignored event: ${event || "unknown"}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract fields from webhook payload
    const linkId = String(payload.link_id ?? payload.payment_link_id ?? "");
    const status = String(payload.status ?? "completed").toLowerCase();
    const amount = payload.amount != null ? Number(payload.amount) : null;
    const receivedAmount = payload.received_amount != null ? Number(payload.received_amount) : null;
    const currency = String(payload.currency ?? "USD").toUpperCase();
    const receivedAsset = String(payload.received_asset ?? "");
    const receivedNetwork = String(payload.received_network ?? "");
    const payoutNetwork = String(payload.payout_network ?? "");
    const customerEmail = String(payload.customer_email ?? "");
    const description = String(payload.description ?? "");
    const transactionHash = String(payload.transaction_hash ?? "");
    const paidAt = payload.paid_at ? String(payload.paid_at) : new Date().toISOString();

    // Match the payment using link_id as the primary key
    if (!linkId) {
      // No link_id — store as an unmatched webhook record for manual review
      const insertBody: Record<string, unknown> = {
        event,
        payment_link_id: null,
        link_id: null,
        status,
        amount,
        received_amount: receivedAmount,
        currency,
        received_asset: receivedAsset || null,
        received_network: receivedNetwork || null,
        payout_network: payoutNetwork || null,
        customer_email: customerEmail || null,
        description: description || null,
        transaction_hash: transactionHash || null,
        paid_at: paidAt,
        raw_payload: body,
      };
      await supabaseRequest("rampex_payments", "POST", insertBody);
      return new Response(
        JSON.stringify({ success: true, message: "Webhook stored without link_id match — manual review required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find the existing pending payment record by link_id
    const existing = await supabaseRequest(
      `rampex_payments?link_id=eq.${encodeURIComponent(linkId)}&select=*`,
      "GET",
    ) as Array<Record<string, unknown>> | null;

    if (!existing || existing.length === 0) {
      // No matching record — store the webhook for manual review
      const insertBody: Record<string, unknown> = {
        event,
        payment_link_id: linkId,
        link_id: linkId,
        status,
        amount,
        received_amount: receivedAmount,
        currency,
        received_asset: receivedAsset || null,
        received_network: receivedNetwork || null,
        payout_network: payoutNetwork || null,
        customer_email: customerEmail || null,
        description: description || null,
        transaction_hash: transactionHash || null,
        paid_at: paidAt,
        raw_payload: body,
      };
      await supabaseRequest("rampex_payments", "POST", insertBody);
      return new Response(
        JSON.stringify({ success: true, message: "No matching pending payment — webhook stored for manual review." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const record = existing[0];
    const recordId = record.id as string;
    const currentVerified = Boolean(record.verified);
    const currentStatus = String(record.status ?? "");

    // Idempotency: if already verified/completed, return 200 without re-processing
    if (currentVerified || currentStatus === "completed") {
      return new Response(
        JSON.stringify({ success: true, message: "Payment already verified — duplicate webhook ignored." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate amount: the payment amount must match the expected $90 USD
    const recordAmount = Number(record.amount ?? 0);
    const webhookAmount = amount ?? receivedAmount ?? recordAmount;
    const amountMatches = Math.abs(webhookAmount - EXPECTED_AMOUNT) < 0.01;

    if (!amountMatches) {
      // Amount mismatch — update the record but do NOT verify
      await supabaseRequest(
        `rampex_payments?id=eq.${encodeURIComponent(recordId)}`,
        "PATCH",
        {
          status: "amount_mismatch",
          received_amount: receivedAmount,
          received_asset: receivedAsset || null,
          received_network: receivedNetwork || null,
          payout_network: payoutNetwork || null,
          transaction_hash: transactionHash || null,
          paid_at: paidAt,
          raw_payload: body,
        },
      );
      return new Response(
        JSON.stringify({ success: true, message: "Amount mismatch — payment not verified." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the rampex_payments record to completed + verified
    const updateBody: Record<string, unknown> = {
      event,
      status: "completed",
      verified: true,
      received_amount: receivedAmount,
      received_asset: receivedAsset || null,
      received_network: receivedNetwork || null,
      payout_network: payoutNetwork || null,
      transaction_hash: transactionHash || null,
      paid_at: paidAt,
      raw_payload: body,
    };

    await supabaseRequest(
      `rampex_payments?id=eq.${encodeURIComponent(recordId)}`,
      "PATCH",
      updateBody,
    );

    // Update the application — insert a verified payment record and advance the workflow
    const applicationId = record.application_id as string | null;
    const userId = record.user_id as string | null;

    if (applicationId && userId) {
      // Insert a verified payment into the existing payments table (same pattern as NOWPayments)
      await supabaseRequest("payments", "POST", {
        user_id: userId,
        application_id: applicationId,
        amount: EXPECTED_AMOUNT,
        currency: "USD",
        method: "Card (Rampex)",
        status: "Verified",
      });

      // Advance application to step 6 "Under Review" (same as NOWPayments flow)
      await supabaseRequest(
        `applications?id=eq.${encodeURIComponent(applicationId)}`,
        "PATCH",
        {
          current_step: 6,
          status: "Under Review",
          updated_at: new Date().toISOString(),
        },
      );

      // Send notification to the applicant
      await supabaseRequest("notifications", "POST", {
        user_id: userId,
        type: "payment",
        title: "Card Payment Confirmed",
        message: `Your registration fee of $${EXPECTED_AMOUNT} USD has been confirmed via card payment (Rampex). Your application is now under review.`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event,
        status: "completed",
        link_id: linkId,
        record_id: recordId,
        application_id: applicationId,
        verified: true,
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
