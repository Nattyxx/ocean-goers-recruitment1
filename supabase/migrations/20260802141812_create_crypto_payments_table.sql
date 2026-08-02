/*
# Crypto Payments (NOWPayments USDT TRC20) — Table + RLS

## Summary
Adds a `crypto_payments` table to track NOWPayments cryptocurrency transactions
(USDT via TRC20 network) for the registration fee. This runs alongside the
existing `payments` table — no changes to existing tables or payment flows.

## 1. New Table: crypto_payments
- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles, DEFAULT auth.uid())
- `application_id` (uuid, FK -> applications, ON DELETE CASCADE)
- `applicant_name` (text) — denormalized for admin display
- `email` (text) — applicant email at time of payment
- `order_id` (text, unique) — merchant order ID sent to NOWPayments
- `nowpayments_id` (text) — NOWPayments payment ID from API
- `amount` (numeric) — payment amount in USD
- `currency` (text, default 'USD')
- `pay_currency` (text, default 'usdttrc20')
- `status` (text, default 'waiting') — waiting|confirming|confirmed|finished|failed|expired|refunded
- `payment_url` (text) — NOWPayments invoice URL
- `transaction_hash` (text) — on-chain tx hash from IPN
- `payment_date` (timestamptz) — when payment was confirmed
- `created_at` / `updated_at` (timestamptz)

## 2. Security (RLS)
- Applicants: SELECT/INSERT/UPDATE/DELETE own rows (user_id = auth.uid()).
- Admins: SELECT/UPDATE all rows (is_admin = true).
- Webhook edge function uses service role key (bypasses RLS).

## 3. Indexes
- user_id, nowpayments_id, order_id
*/

CREATE TABLE IF NOT EXISTS crypto_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  applicant_name text,
  email text,
  order_id text UNIQUE,
  nowpayments_id text,
  amount numeric DEFAULT 90,
  currency text DEFAULT 'USD',
  pay_currency text DEFAULT 'usdttrc20',
  status text DEFAULT 'waiting',
  payment_url text,
  transaction_hash text,
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crypto_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_crypto_payments" ON crypto_payments;
CREATE POLICY "select_own_crypto_payments" ON crypto_payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_crypto_payments" ON crypto_payments;
CREATE POLICY "insert_own_crypto_payments" ON crypto_payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_crypto_payments" ON crypto_payments;
CREATE POLICY "update_own_crypto_payments" ON crypto_payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_crypto_payments" ON crypto_payments;
CREATE POLICY "delete_own_crypto_payments" ON crypto_payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_crypto_payments" ON crypto_payments;
CREATE POLICY "admin_select_crypto_payments" ON crypto_payments FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "admin_update_crypto_payments" ON crypto_payments;
CREATE POLICY "admin_update_crypto_payments" ON crypto_payments FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_crypto_payments_user ON crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_nowpayments_id ON crypto_payments(nowpayments_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_order_id ON crypto_payments(order_id);

CREATE OR REPLACE FUNCTION update_crypto_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crypto_payments_updated_at ON crypto_payments;
CREATE TRIGGER trg_crypto_payments_updated_at
  BEFORE UPDATE ON crypto_payments
  FOR EACH ROW EXECUTE FUNCTION update_crypto_payments_updated_at();
