/*
# Schedule automated email reminders with pg_cron

## Summary
Enables the pg_cron extension and schedules a job that calls the `email-reminders`
edge function every hour. The edge function:
- Sends document upload reminders (24h, 3d, 7d after application submission)
- Sends payment reminders (24h, 3d, 7d after documents are uploaded)
- Retries failed emails
All deduplication is handled inside the edge function via the email_log table.

## 1. Extension
- Enables pg_cron extension (required for scheduled jobs).

## 2. Scheduled job
- Job name: `email_reminders_hourly`
- Schedule: every hour (`0 * * * *`)
- Calls the edge function via the Supabase functions endpoint using net.http_post

## 3. Notes
- The edge function has verify_jwt = false so the cron job can call it without auth.
- The edge function handles all dedup logic and never sends duplicate emails.
- Idempotent: unschedules first, then creates.
*/

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing job if any
DO $$
BEGIN
  PERFORM cron.unschedule('email_reminders_hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule the hourly reminder job
-- The edge function has verify_jwt=false so no auth header needed
SELECT cron.schedule(
  'email_reminders_hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ocean-goers-recruitm-hblk.bolt.host/functions/v1/email-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
