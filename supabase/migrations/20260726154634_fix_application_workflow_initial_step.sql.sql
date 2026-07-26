-- Fix the application workflow initial state.
-- Per the workflow spec, a freshly submitted application is at "Under Review" (step 3):
--   step 1 Application Submitted = Completed
--   step 2 Documents Received    = Completed (if docs uploaded)
--   step 3 Under Review          = In Progress  <-- current
--   steps 4-7                     = Pending
-- The original migration defaulted to step 1 / 'Pending', which left "Application Submitted"
-- showing as In Progress. Correct the default and backfill any rows still in that state.

ALTER TABLE applications ALTER COLUMN current_step SET DEFAULT 3;
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'Under Review';

-- Backfill applications that were never advanced (still at the old initial state).
-- Only touch rows that are still at step 1 with status 'Pending'; leave advanced/rejected rows alone.
UPDATE applications
SET current_step = 3, status = 'Under Review', updated_at = now()
WHERE current_step = 1 AND status = 'Pending';
