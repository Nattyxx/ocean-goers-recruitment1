/*
# Add sent_by column to email_log for manual email tracking

## Summary
Adds a `sent_by` column to the `email_log` table to record which admin
sent a manual email. This enables the "Sent By (Admin)" display in the
admin dashboard's per-applicant email history.

## Changes
- Add `sent_by` uuid column (nullable, references profiles.id)
- Index on `sent_by` for admin activity lookups
*/

ALTER TABLE email_log ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_log_sent_by ON email_log(sent_by);
