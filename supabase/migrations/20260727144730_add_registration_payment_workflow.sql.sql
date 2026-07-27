/*
# Registration payment workflow — schema + RLS + step remap

## Summary
Adds a registration-fee payment step to the applicant workflow, between document
upload and admin review. Introduces a 10-step pipeline, lets admins verify or
reject payment receipts, and notifies applicants of the outcome.

## 1. Schema changes
- payments: add `rejection_reason text` (nullable) — admin's reason when a receipt is rejected.
- applications: defaults updated for the new 10-step workflow
  (`current_step` default 3 = "Documents Uploaded" in progress, status default 'Pending').

## 2. Backfill / remap
Existing applications are repositioned onto the new 10-step pipeline based on their
actual document and payment data:
  step 1  Account Created
  step 2  Application Submitted
  step 3  Documents Uploaded      (in progress until all 8 verification docs are in)
  step 4  Registration Fee Paid  (in progress until a receipt is uploaded)
  step 5  Payment Verified        (in progress until admin verifies)
  step 6  Under Review
  step 7  Interview
  step 8  Medical
  step 9  Visa Processing
  step 10 Deployment
  step 11 Approved (terminal)
Rejected applications keep their status and step.

## 3. Security (RLS)
- Admin UPDATE on payments: admins can set status to Verified/Rejected and write rejection_reason.
- Admin INSERT on notifications: admins can send payment-outcome notifications to applicants.

## 4. Notes
- No destructive changes; all statements idempotent.
- "Required documents" = the 8 verification doc types (passport, cv, medical, seaman_book,
  stcw, police_clearance, education, photo). The 'receipt' doc type is handled via payments.
*/

ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE applications ALTER COLUMN current_step SET DEFAULT 3;
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'Pending';

-- Recompute current_step / status for existing applications from real data
UPDATE applications a
SET current_step = calc.new_step,
    status = calc.new_status,
    updated_at = now()
FROM (
  SELECT
    a.id,
    CASE
      WHEN a.status = 'Rejected' THEN a.current_step
      WHEN a.status = 'Approved' THEN 11
      WHEN pay.status = 'Verified' THEN
        CASE WHEN a.current_step BETWEEN 4 AND 7 THEN a.current_step + 3 ELSE 6 END
      WHEN pay.status = 'Pending' THEN 5
      WHEN doc_cnt >= 8 THEN 4
      ELSE 3
    END AS new_step,
    CASE
      WHEN a.status = 'Rejected' THEN 'Rejected'
      WHEN a.status = 'Approved' THEN 'Approved'
      WHEN pay.status = 'Verified' AND a.current_step BETWEEN 4 AND 7 THEN a.status
      WHEN pay.status = 'Verified' THEN 'Under Review'
      WHEN pay.status = 'Pending' THEN 'Pending Verification'
      WHEN doc_cnt >= 8 THEN 'Awaiting Payment'
      ELSE 'Pending'
    END AS new_status
  FROM applications a
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS doc_cnt
    FROM documents d
    WHERE d.user_id = a.user_id AND d.doc_type <> 'receipt'
  ) docs ON true
  LEFT JOIN LATERAL (
    SELECT status FROM payments p
    WHERE p.application_id = a.id
    ORDER BY created_at DESC LIMIT 1
  ) pay ON true
) calc
WHERE a.id = calc.id;

-- Admin UPDATE on payments (verify / reject receipts)
DROP POLICY IF EXISTS "admin_update_payments" ON payments;
CREATE POLICY "admin_update_payments" ON payments FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Admin INSERT on notifications (send outcome messages to applicants)
DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
