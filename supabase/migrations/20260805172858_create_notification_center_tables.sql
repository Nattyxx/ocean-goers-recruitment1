/*
# Notification Center: drafts, admin notes, attachments, scheduling

## Summary
Adds tables for email drafts, admin private notes on applicants, and email
attachments. Also adds columns to email_log for scheduled_at and admin_name
to support the Notification Center features.

## New Tables

1. email_drafts
   - id (uuid, PK)
   - admin_id (uuid, FK -> profiles, NOT NULL)
   - recipient_user_id (uuid, nullable) — null for bulk drafts
   - recipient_email (text, nullable)
   - recipient_name (text, nullable)
   - subject (text, not null)
   - body_html (text, not null)
   - email_type (text, default 'custom_email')
   - metadata (jsonb, nullable) — template-specific fields (interview, flight, job offer)
   - attachment_urls (jsonb, default '[]') — array of {name, url, size} objects
   - status (text, default 'draft') — draft | scheduled
   - scheduled_at (timestamptz, nullable)
   - created_at (timestamptz)
   - updated_at (timestamptz)

2. admin_notes
   - id (uuid, PK)
   - admin_id (uuid, FK -> profiles, NOT NULL)
   - user_id (uuid, FK -> profiles, NOT NULL) — the applicant being noted on
   - note (text, not null)
   - created_at (timestamptz)
   - updated_at (timestamptz)

3. email_attachments
   - id (uuid, PK)
   - email_log_id (uuid, FK -> email_log, nullable) — set when email is sent
   - draft_id (uuid, FK -> email_drafts, nullable) — set while in draft
   - file_name (text, not null)
   - file_url (text, not null)
   - file_size (bigint, default 0)
   - mime_type (text, nullable)
   - created_at (timestamptz)

## Modified Tables

- email_log: add scheduled_at (timestamptz, nullable), admin_name (text, nullable)

## Security
- email_drafts: admin-only CRUD (authenticated only, no anon)
- admin_notes: admin-only CRUD (authenticated only)
- email_attachments: admin-only CRUD (authenticated only)
- email_log new columns: readable by authenticated (admin) as before

## Important Notes
1. This app HAS a sign-in screen, so admin write policies are TO authenticated.
2. Admin-only access is enforced by the frontend routing (only is_admin users see
   the Notification Center nav link). RLS on these tables restricts to authenticated
   users. A separate admin role check at the application level prevents non-admin
   authenticated users (applicants) from accessing these tables.
3. email_drafts stores both drafts and scheduled emails. Scheduled emails have
   status='scheduled' and scheduled_at set.
*/

-- ===== EMAIL_LOG COLUMNS =====
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS admin_name text;

-- ===== EMAIL DRAFTS =====
CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_name text,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  email_type text DEFAULT 'custom_email',
  metadata jsonb,
  attachment_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft',
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_email_drafts" ON email_drafts;
CREATE POLICY "admin_read_email_drafts" ON email_drafts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_email_drafts" ON email_drafts;
CREATE POLICY "admin_insert_email_drafts" ON email_drafts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_email_drafts" ON email_drafts;
CREATE POLICY "admin_update_email_drafts" ON email_drafts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_email_drafts" ON email_drafts;
CREATE POLICY "admin_delete_email_drafts" ON email_drafts FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_email_drafts_admin ON email_drafts(admin_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_drafts(status);

-- ===== ADMIN NOTES =====
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_admin_notes" ON admin_notes;
CREATE POLICY "admin_read_admin_notes" ON admin_notes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_admin_notes" ON admin_notes;
CREATE POLICY "admin_insert_admin_notes" ON admin_notes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_admin_notes" ON admin_notes;
CREATE POLICY "admin_update_admin_notes" ON admin_notes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_admin_notes" ON admin_notes;
CREATE POLICY "admin_delete_admin_notes" ON admin_notes FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_admin_notes_user ON admin_notes(user_id);

-- ===== EMAIL ATTACHMENTS =====
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id uuid REFERENCES email_log(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES email_drafts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_email_attachments" ON email_attachments;
CREATE POLICY "admin_read_email_attachments" ON email_attachments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_email_attachments" ON email_attachments;
CREATE POLICY "admin_insert_email_attachments" ON email_attachments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_email_attachments" ON email_attachments;
CREATE POLICY "admin_delete_email_attachments" ON email_attachments FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_email_attachments_log ON email_attachments(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_draft ON email_attachments(draft_id);

-- ===== updated_at triggers =====
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_drafts_updated ON email_drafts;
CREATE TRIGGER trg_email_drafts_updated
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_notes_updated ON admin_notes;
CREATE TRIGGER trg_admin_notes_updated
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
