/*
# Rampex Card Payment Webhook — Table + RLS

## Summary
Adds a `rampex_payments` table to store incoming Rampex `payment.completed`
webhook notifications for card payments (Visa/Mastercard via Rampex hosted
checkout). This mirrors the existing `crypto_payments` pattern but does NOT
auto-verify any application — the current reusable Rampex payment link
(https://rampex.io/pay/sefnqNMx) does not embed an Ocean Goers user/order ID,
so the webhook cannot yet safely associate a payment to a specific applicant.
Records are stored for manual reconciliation and future association.

## 1. New Table: rampex_payments
- `id` (uuid, PK)
- `event` (text) — webhook event type (e.g. "payment.completed")
- `payment_link_id` (text, nullable) — Rampex payment link ID / link_id
- `user_id` (uuid, nullable, FK -> profiles) — set in future when association is built
- `application_id` (uuid, nullable, FK -> applications) — set in future when association is built
- `status` (text) — payment status from Rampex
- `amount` (numeric, nullable) — payment amount
- `received_amount` (numeric, nullable) — actually received amount
- `currency` (text, default 'USD')
- `received_asset` (text, nullable) — e.g. card currency / asset
- `received_network` (text, nullable)
- `payout_network` (text, nullable)
- `customer_email` (text, nullable) — payer email from webhook
- `description` (text, nullable)
- `transaction_hash` (text, nullable) — Rampex transaction reference
- `paid_at` (timestamptz, nullable) — when payment was completed
- `raw_payload` (text, nullable) — full raw webhook body for audit
- `verified` (boolean, default false) — set true only when manually/admin verified
- `created_at` / `updated_at` (timestamptz)

## 2. Security (RLS)
- Applicants: SELECT own rows only (user_id = auth.uid()). No INSERT/UPDATE/DELETE
  from the client — the webhook uses the service role key (bypasses RLS).
- Admins: SELECT/UPDATE all rows (is_admin = true).
- The webhook edge function uses the service role key and bypasses RLS.

## 3. Indexes
- payment_link_id, customer_email, created_at

## 4. Notes
- No destructive changes to existing tables.
- No changes to existing payment flows (ETB manual, NOWPayments USDT).
- The `verified` column defaults to false and is NOT set by the webhook.
  Admins can manually verify a Rampex payment in the future.
*/

CREATE TABLE IF NOT EXISTS rampex_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text,
  payment_link_id text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  status text DEFAULT 'completed',
  amount numeric,
  received_amount numeric,
  currency text DEFAULT 'USD',
  received_asset text,
  received_network text,
  payout_network text,
  customer_email text,
  description text,
  transaction_hash text,
  paid_at timestamptz,
  raw_payload text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rampex_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rampex_payments" ON rampex_payments;
CREATE POLICY "select_own_rampex_payments" ON rampex_payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_rampex_payments" ON rampex_payments;
CREATE POLICY "admin_select_rampex_payments" ON rampex_payments FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

DROP POLICY IF EXISTS "admin_update_rampex_payments" ON rampex_payments;
CREATE POLICY "admin_update_rampex_payments" ON rampex_payments FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_rampex_payments_link_id ON rampex_payments(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_rampex_payments_email ON rampex_payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_rampex_payments_created ON rampex_payments(created_at);

CREATE OR REPLACE FUNCTION update_rampex_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rampex_payments_updated_at ON rampex_payments;
CREATE TRIGGER trg_rampex_payments_updated_at
  BEFORE UPDATE ON rampex_payments
  FOR EACH ROW EXECUTE FUNCTION update_rampex_payments_updated_at();
