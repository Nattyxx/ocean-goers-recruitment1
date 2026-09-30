/*
# Extend rampex_payments for applicant-specific Rampex card payments

## Summary
Adds columns to the existing `rampex_payments` table so it can store
applicant-specific Rampex payment links created by the create-rampex-payment
edge function, and be matched by the webhook via Rampex link_id.

## 1. New Columns (all additive, no data loss)
- `link_id` (text, nullable) — Rampex's unique link ID returned by the API,
  used as the primary matching key in the webhook.
- `internal_order_id` (text, nullable) — Ocean Goers internal order ID
  (e.g. OG-{applicationId}-{timestamp}).
- `payment_url` (text, nullable) — Rampex hosted checkout URL.
- `provider` (text, default 'rampex') — payment provider identifier.
- `applicant_name` (text, nullable) — full name at time of payment creation.
- `phone` (text, nullable) — applicant phone at time of payment creation.

## 2. Constraints
- UNIQUE on `link_id` — prevents duplicate webhook processing for the same
  Rampex link. Multiple NULLs allowed (webhook-only records without a link).

## 3. Indexes
- `idx_rampex_payments_app_id` on application_id
- `idx_rampex_payments_user_id` on user_id
- `idx_rampex_payments_status` on status
- `idx_rampex_payments_internal_order` on internal_order_id

## 4. RLS
- No policy changes — existing policies already cover the new columns.
  Webhook uses service role key (bypasses RLS).

## 5. Notes
- No destructive changes. All additions are additive.
- Existing webhook-only records keep their NULL values for new columns.
*/

ALTER TABLE rampex_payments ADD COLUMN IF NOT EXISTS link_id text;
ALTER TABLE rampex_payments ADD COLUMN IF NOT EXISTS internal_order_id text;
ALTER TABLE rampex_payments ADD COLUMN IF NOT EXISTS payment_url text;
ALTER TABLE rampex_payments ADD COLUMN IF NOT EXISTS provider text DEFAULT 'rampex';
ALTER TABLE rampex_payments ADD COLUMN IF NOT EXISTS applicant_name text;
ALTER TABLE rampex_payments ADD COLUMN IF NOT EXISTS phone text;

-- Unique constraint on link_id (partial — only where link_id is NOT NULL)
DROP INDEX IF EXISTS idx_rampex_payments_link_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rampex_payments_link_id_unique
  ON rampex_payments(link_id) WHERE link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rampex_payments_app_id ON rampex_payments(application_id);
CREATE INDEX IF NOT EXISTS idx_rampex_payments_user_id ON rampex_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rampex_payments_status ON rampex_payments(status);
CREATE INDEX IF NOT EXISTS idx_rampex_payments_internal_order ON rampex_payments(internal_order_id);
