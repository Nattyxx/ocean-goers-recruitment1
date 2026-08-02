import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOWPAYMENTS_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const NP_API_BASE = "https://api.nowpayments.io/v1";

interface CreatePaymentPayload {
  userId: string;
  applicantName: string;
  email: string;
  applicationId: string;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!NOWPAYMENTS_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "NOWPAYMENTS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { userId, applicantName, email, applicationId } = await req.json() as CreatePaymentPayload;

    if (!userId || !email || !applicationId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const orderId = `OG-${Date.now()}-${userId.slice(0, 8)}`;
    const priceAmount = 90;

    // Create payment via NOWPayments API
    const npRes = await fetch(`${NP_API_BASE}/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NOWPAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: orderId,
        order_description: `Ocean Goers Registration Fee — ${applicantName || "Applicant"}`,
        success_url: `${SUPABASE_URL.replace(".supabase.co", "")}.bolt.host/payment?crypto=success`,
        cancel_url: `${SUPABASE_URL.replace(".supabase.co", "")}.bolt.host/payment?crypto=cancel`,
        ipn_callback_url: `${SUPABASE_URL}/functions/v1/nowpayments-webhook`,
      }),
    });

    if (!npRes.ok) {
      const text = await npRes.text();
      return new Response(
        JSON.stringify({ success: false, error: `NOWPayments API error ${npRes.status}: ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const npData = await npRes.json();

    // Save payment record in Supabase
    await supabaseRequest("crypto_payments", "POST", {
      user_id: userId,
      application_id: applicationId,
      applicant_name: applicantName,
      email,
      order_id: orderId,
      nowpayments_id: String(npData.id ?? ""),
      amount: priceAmount,
      currency: "USD",
      pay_currency: "usdttrc20",
      status: npData.status ?? "waiting",
      payment_url: npData.invoice_url ?? "",
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: npData.invoice_url ?? "",
        orderId,
        nowpaymentsId: String(npData.id ?? ""),
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
