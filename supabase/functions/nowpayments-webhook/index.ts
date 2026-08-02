import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOWPAYMENTS_IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

async function verifySignature(req: Request): Promise<boolean> {
  if (!NOWPAYMENTS_IPN_SECRET) return true; // skip if not configured

  const signatureHeader = req.headers.get("x-nowpayments-sig") ?? "";
  if (!signatureHeader) return false;

  const bodyText = await req.clone().text();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(NOWPAYMENTS_IPN_SECRET),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyText));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatureHeader === expected;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify IPN signature
    const valid = await verifySignature(req);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    // NOWPayments IPN payload fields
    const paymentStatus = String(body.payment_status ?? "").toLowerCase();
    const orderId = String(body.order_id ?? "");
    const nowpaymentsId = String(body.payment_id ?? "");
    const payAmount = body.price_amount ? Number(body.price_amount) : null;
    const payCurrency = String(body.price_currency ?? "usd");
    const payCryptoCurrency = String(body.pay_currency ?? "usdttrc20");
    const txHash = String(body.payin_hash ?? body.payout_hash ?? "");

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find the crypto payment by order_id
    const existing = await supabaseRequest(
      `crypto_payments?order_id=eq.${encodeURIComponent(orderId)}&select=*`,
      "GET",
    ) as Array<Record<string, unknown>> | null;

    if (!existing || existing.length === 0) {
      return new Response(
        JSON.stringify({ error: "Payment record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const record = existing[0];
    const currentStatus = String(record.status ?? "waiting");

    // Prevent duplicate confirmations — only update if status changed
    if (currentStatus === paymentStatus || currentStatus === "finished" || currentStatus === "confirmed") {
      if (currentStatus === "finished" || currentStatus === "confirmed") {
        return new Response(
          JSON.stringify({ success: true, message: "Already confirmed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Determine if payment is confirmed/finished
    const isConfirmed = paymentStatus === "confirmed" || paymentStatus === "finished";
    const isFailed = paymentStatus === "failed" || paymentStatus === "expired" || paymentStatus === "refunded";

    const updateBody: Record<string, unknown> = {
      status: paymentStatus || currentStatus,
      updated_at: new Date().toISOString(),
    };

    if (txHash) updateBody.transaction_hash = txHash;
    if (isConfirmed) {
      updateBody.payment_date = new Date().toISOString();
    }

    // Update the crypto_payments record
    await supabaseRequest(
      `crypto_payments?order_id=eq.${encodeURIComponent(orderId)}`,
      "PATCH",
      updateBody,
    );

    // If confirmed/finished: mark registration payment as completed and unlock next step
    if (isConfirmed) {
      const applicationId = record.application_id as string;
      const userId = record.user_id as string;
      const applicantName = record.applicant_name as string;
      const amount = Number(record.amount ?? 90);

      // Insert a verified payment record into the existing payments table
      // so the admin workflow picks it up
      await supabaseRequest("payments", "POST", {
        user_id: userId,
        application_id: applicationId,
        amount,
        currency: "USD",
        method: "USDT (TRC20) — NOWPayments",
        status: "Verified",
      });

      // Unlock next application step (move to "Under Review" step 6)
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
        title: "Payment Received Successfully",
        message: `Your registration fee of $${amount} USD has been confirmed via USDT (TRC20). Your registration has been confirmed and your application is now under review.`,
      });
    }

    // If failed/expired: send notification
    if (isFailed) {
      const userId = record.user_id as string;
      await supabaseRequest("notifications", "POST", {
        user_id: userId,
        type: "payment",
        title: "Crypto Payment Failed",
        message: `Your USDT payment has ${paymentStatus}. Please try again with a new payment.`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: paymentStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
