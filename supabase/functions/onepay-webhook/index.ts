import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ONEPAY_API_KEY = Deno.env.get("ONEPAY_API_KEY") ?? "";
const ONEPAY_WEBHOOK_SECRET = Deno.env.get("ONEPAY_WEBHOOK_SECRET") ?? "";
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

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifyV2Signature(
  rawBody: string,
  signatureV2Header: string,
): Promise<boolean> {
  if (!ONEPAY_WEBHOOK_SECRET || !signatureV2Header) return false;

  const parts: Record<string, string> = {};
  for (const kv of signatureV2Header.split(",")) {
    const pair = kv.split("=", 2);
    if (pair.length === 2) {
      parts[pair[0].trim()] = pair[1].trim();
    }
  }

  const t = Number(parts.t);
  if (!Number.isInteger(t) || t <= 0) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > 300) return false;

  const signedData = `${t}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ONEPAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedData));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expectedBytes = new TextEncoder().encode(expectedHex);
  const sentBytes = new TextEncoder().encode(parts.v1 ?? "");

  return timingSafeEqual(expectedBytes, sentBytes);
}

async function verifyV1Signature(
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!ONEPAY_WEBHOOK_SECRET || !signatureHeader) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ONEPAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expectedBytes = hexToBytes(expectedHex);
  let receivedBytes: Uint8Array;
  try {
    receivedBytes = hexToBytes(signatureHeader);
  } catch {
    return false;
  }

  return timingSafeEqual(expectedBytes, receivedBytes);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    const sigV2Header = req.headers.get("x-1pay-signature-v2") ?? "";
    const sigV1Header = req.headers.get("x-1pay-signature") ?? "";

    const v2Valid = await verifyV2Signature(rawBody, sigV2Header);
    const v1Valid = v2Valid ? true : await verifyV1Signature(rawBody, sigV1Header);

    if (!v2Valid && !v1Valid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let payload: { event?: string; data?: Record<string, unknown>; at?: string };
    try {
      payload = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown>; at?: string };
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = String(req.headers.get("x-1pay-event") ?? payload.event ?? "");
    const data = payload.data ?? {};
    const paymentId = String(data.paymentId ?? "");
    const reference = data.reference != null ? String(data.reference) : null;
    const amount = data.amount != null ? Number(data.amount) : null;
    const currency = String(data.currency ?? "USD").toUpperCase();
    const status = String(data.status ?? "");
    const livemode = data.livemode != null ? Boolean(data.livemode) : null;
    const valueCoin = data.valueCoin != null ? Number(data.valueCoin) : null;
    const valueForwarded = data.valueForwarded != null ? Number(data.valueForwarded) : null;
    const commission = data.commission != null ? Number(data.commission) : null;
    const txidOut = data.txidOut != null ? String(data.txidOut) : null;
    const paidAtStr = payload.at ?? new Date().toISOString();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Missing paymentId in webhook payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const existing = await supabaseRequest(
      `onepay_payments?onepay_payment_id=eq.${encodeURIComponent(paymentId)}&select=*`,
      "GET",
    ) as Array<Record<string, unknown>> | null;

    if (!existing || existing.length === 0) {
      return new Response(
        JSON.stringify({ error: "No matching payment record found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const record = existing[0];
    const recordId = record.id as string;
    const currentVerified = Boolean(record.verified);
    const currentStatus = String(record.status ?? "");

    // Idempotency: if already verified/completed, return 200 without re-processing
    if (currentVerified || currentStatus === "completed" || currentStatus === "paid") {
      return new Response(
        JSON.stringify({ success: true, message: "Payment already verified — duplicate webhook ignored." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the record with webhook data for all events
    const updateBody: Record<string, unknown> = {
      webhook_event: event,
      status: status || event.replace("payment.", ""),
      livemode: livemode,
      value_coin: valueCoin,
      value_forwarded: valueForwarded,
      commission: commission,
      txid_out: txidOut,
      raw_payload: rawBody,
    };

    // Only payment.paid can result in a verified Ocean Goers payment
    if (event !== "payment.paid") {
      await supabaseRequest(
        `onepay_payments?id=eq.${encodeURIComponent(recordId)}`,
        "PATCH",
        updateBody,
      );
      return new Response(
        JSON.stringify({ success: true, message: `Event ${event} recorded — payment not verified.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- payment.paid validation ---

    // 1. Amount check
    if (amount == null || Math.abs(amount - EXPECTED_AMOUNT) >= 0.01) {
      updateBody.status = "amount_mismatch";
      await supabaseRequest(
        `onepay_payments?id=eq.${encodeURIComponent(recordId)}`,
        "PATCH",
        updateBody,
      );
      return new Response(
        JSON.stringify({ success: true, message: "Amount mismatch — payment not verified." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Currency check
    if (currency !== EXPECTED_CURRENCY) {
      updateBody.status = "currency_mismatch";
      await supabaseRequest(
        `onepay_payments?id=eq.${encodeURIComponent(recordId)}`,
        "PATCH",
        updateBody,
      );
      return new Response(
        JSON.stringify({ success: true, message: "Currency mismatch — payment not verified." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Server-side recheck: GET /v1/payments/:id
    let serverConfirmed = false;
    if (ONEPAY_API_KEY) {
      try {
        const recheckRes = await fetch(`https://api.1pay.cx/v1/payments/${encodeURIComponent(paymentId)}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${ONEPAY_API_KEY}`,
            "Content-Type": "application/json",
          },
        });

        if (recheckRes.ok) {
          const recheckData = await recheckRes.json() as {
            status?: string;
            amount?: number;
            currency?: string;
            livemode?: boolean;
          };

          if (
            String(recheckData.status ?? "").toLowerCase() === "paid" &&
            recheckData.amount != null &&
            Math.abs(Number(recheckData.amount) - EXPECTED_AMOUNT) < 0.01 &&
            String(recheckData.currency ?? "USD").toUpperCase() === EXPECTED_CURRENCY
          ) {
            serverConfirmed = true;
          }
        }
      } catch {
        // If recheck fails (network error etc.), proceed with webhook data
        serverConfirmed = true;
      }
    } else {
      // No API key for recheck — proceed with webhook data
      serverConfirmed = true;
    }

    if (!serverConfirmed) {
      updateBody.status = "recheck_failed";
      await supabaseRequest(
        `onepay_payments?id=eq.${encodeURIComponent(recordId)}`,
        "PATCH",
        updateBody,
      );
      return new Response(
        JSON.stringify({ success: true, message: "Server-side recheck failed — payment not verified." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- All validation passed: mark verified ---

    updateBody.status = "completed";
    updateBody.verified = true;
    updateBody.paid_at = paidAtStr;

    await supabaseRequest(
      `onepay_payments?id=eq.${encodeURIComponent(recordId)}`,
      "PATCH",
      updateBody,
    );

    const applicationId = record.application_id as string | null;
    const userId = record.user_id as string | null;

    if (applicationId && userId) {
      // Insert a verified payment into the existing payments table (same pattern as Rampex/NOWPayments)
      await supabaseRequest("payments", "POST", {
        user_id: userId,
        application_id: applicationId,
        amount: EXPECTED_AMOUNT,
        currency: "USD",
        method: "Card (1Pay)",
        status: "Verified",
      });

      // Advance application to step 6 "Under Review" (same as Rampex/NOWPayments flow)
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
        message: `Your registration fee of $${EXPECTED_AMOUNT} USD has been confirmed via card payment (1Pay). Your application is now under review.`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event,
        status: "completed",
        paymentId,
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
