/*
# Create email_log table for automatic email notification system

1. New Tables
- `email_log`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles.id, identifies the applicant)
  - `email_to` (text, recipient email address)
  - `recipient_name` (text, applicant full name for personalization)
  - `email_type` (text, one of: application_submitted, payment_required, payment_confirmed, application_approved, application_rejected, interview_invitation)
  - `subject` (text, email subject line)
  - `body_html` (text, full HTML body sent)
  - `status` (text, 'sent' or 'failed')
  - `error_message` (text, nullable, error details if failed)
  - `metadata` (jsonb, nullable, extra data like interview details)
  - `sent_at` (timestamptz, when the email was sent)
  - `created_at` (timestamptz, default now())

2. Indexes
- Index on `user_id` for per-applicant email history lookups
- Index on `email_type` for dedup checks
- Index on `created_at` for chronological sorting

3. Security (RLS)
- Enable RLS on `email_log`
- SELECT: authenticated users can read their own email history; admins can read all
- INSERT: authenticated users can insert (the edge function uses service role, bypassing RLS)
- UPDATE: admin-only (for resend status updates)
- DELETE: admin-only
- Uses a security definer function `is_admin()` to check admin status without RLS recursion
*/

CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_to text NOT NULL,
  recipient_name text,
  email_type text NOT NULL,
  subject text NOT NULL,
  body_html text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  metadata jsonb,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_email_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log(created_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin status (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = uid),
    false
  );
$$;

DROP POLICY IF EXISTS "select_own_or_admin_email_log" ON email_log;
CREATE POLICY "select_own_or_admin_email_log" ON email_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "insert_own_email_log" ON email_log;
CREATE POLICY "insert_own_email_log" ON email_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_admin_email_log" ON email_log;
CREATE POLICY "update_admin_email_log" ON email_log
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "delete_admin_email_log" ON email_log;
CREATE POLICY "delete_admin_email_log" ON email_log
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));
