/*
# 1Pay Card Payment — Table + RLS

## Summary
Creates a `onepay_payments` table to store applicant-specific 1Pay card/crypto
payment links and incoming 1Pay webhook notifications. This mirrors the existing
`rampex_payments` pattern but uses the 1Pay API (https://api.1pay.cx/v1/payments)
to generate unique per-applicant checkout sessions.

## 1. New Table: onepay_payments
- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles, nullable) — Ocean Goers applicant
- `application_id` (uuid, FK -> applications, nullable) — linked application
- `customer_email` (text, nullable) — payer email at time of creation
- `applicant_name` (text, nullable) — full name at time of creation
- `phone` (text, nullable) — phone at time of creation
- `amount` (numeric, not null, default 90) — payment amount
- `currency` (text, not null, default 'USD')
- `provider` (text, default '1pay') — payment provider identifier
- `status` (text, default 'pending') — pending | paid | underpaid | expired | failed | completed
- `verified` (boolean, default false) — set true only when webhook confirms payment.paid
- `internal_order_id` (text, nullable) — e.g. OG-1PAY-{appId}-{timestamp}
- `onepay_payment_id` (text, nullable) — 1Pay's payment ID returned by the API
- `checkout_url` (text, nullable) — full checkout URL returned by 1Pay
- `reference` (text, nullable) — reference sent to 1Pay (same as internal_order_id)
- `webhook_event` (text, nullable) — event name from webhook (payment.paid, etc.)
- `livemode` (boolean, nullable) — whether this was a live (true) or test (false) payment
- `value_coin` (numeric, nullable) — USD value that arrived, from webhook
- `value_forwarded` (numeric, nullable) — legacy field, same as value_coin for notifyUrl
- `commission` (numeric, nullable) — 1Pay fee in USD
- `txid_out` (text, nullable) — settlement transaction ID
- `paid_at` (timestamptz, nullable) — when payment was confirmed
- `raw_payload` (text, nullable) — full raw webhook body for audit
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## 2. Security (RLS)
- Applicants: SELECT own rows only (user_id = auth.uid()). No INSERT/UPDATE/DELETE
  from the client — the webhook and create function use the service role key (bypasses RLS).
- Admins: SELECT all rows (is_admin = true).
- The webhook and create-payment edge functions use the service role key and bypass RLS.

## 3. Indexes
- onepay_payment_id (unique where not null)
- application_id
- user_id
- internal_order_id
- status

## 4. Notes
- No destructive changes to existing tables.
- No changes to Rampex, ETB manual, NOWPayments, auth, or document workflow.
- The `verified` column defaults to false and is NOT set by merely opening the checkout page.
  Only the webhook with a valid payment.paid event sets it to true.
*/

CREATE TABLE IF NOT EXISTS onepay_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  customer_email text,
  applicant_name text,
  phone text,
  amount numeric NOT NULL DEFAULT 90,
  currency text NOT NULL DEFAULT 'USD',
  provider text DEFAULT '1pay',
  status text DEFAULT 'pending',
  verified boolean DEFAULT false,
  internal_order_id text,
  onepay_payment_id text,
  checkout_url text,
  reference text,
  webhook_event text,
  livemode boolean,
  value_coin numeric,
  value_forwarded numeric,
  commission numeric,
  txid_out text,
  paid_at timestamptz,
  raw_payload text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE onepay_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_onepay_payments" ON onepay_payments;
CREATE POLICY "select_own_onepay_payments" ON onepay_payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_onepay_payments" ON onepay_payments;
CREATE POLICY "admin_select_onepay_payments" ON onepay_payments FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "admin_update_onepay_payments" ON onepay_payments;
CREATE POLICY "admin_update_onepay_payments" ON onepay_payments FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE UNIQUE INDEX IF NOT EXISTS idx_onepay_payments_payment_id
  ON onepay_payments(onepay_payment_id) WHERE onepay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onepay_payments_app_id ON onepay_payments(application_id);
CREATE INDEX IF NOT EXISTS idx_onepay_payments_user_id ON onepay_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_onepay_payments_internal_order ON onepay_payments(internal_order_id);
CREATE INDEX IF NOT EXISTS idx_onepay_payments_status ON onepay_payments(status);

CREATE OR REPLACE FUNCTION update_onepay_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onepay_payments_updated_at ON onepay_payments;
CREATE TRIGGER trg_onepay_payments_updated_at
  BEFORE UPDATE ON onepay_payments
  FOR EACH ROW EXECUTE FUNCTION update_onepay_payments_updated_at();