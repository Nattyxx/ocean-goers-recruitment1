/*
# Remap applications to 2-document requirement

Previously the workflow required all 8 verification documents before the
registration fee step. The requirement is now reduced to only Passport + CV.
This remap repositions existing applications onto the 10-step pipeline based
on the new 2-document rule and their current payment data.

## Rules
- step 3 Documents Uploaded: in progress until passport + cv are uploaded
- step 4 Registration Fee Paid: passport + cv done, no payment yet
- step 5 Payment Verified (Pending Verification): receipt uploaded, awaiting admin
- step 6 Under Review: payment verified
- Rejected / Approved rows are left untouched.
*/

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
      WHEN req_done >= 2 THEN 4
      ELSE 3
    END AS new_step,
    CASE
      WHEN a.status = 'Rejected' THEN 'Rejected'
      WHEN a.status = 'Approved' THEN 'Approved'
      WHEN pay.status = 'Verified' AND a.current_step BETWEEN 4 AND 7 THEN a.status
      WHEN pay.status = 'Verified' THEN 'Under Review'
      WHEN pay.status = 'Pending' THEN 'Pending Verification'
      WHEN req_done >= 2 THEN 'Awaiting Payment'
      ELSE 'Pending'
    END AS new_status
  FROM applications a
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS req_done
    FROM documents d
    WHERE d.user_id = a.user_id AND d.doc_type IN ('passport', 'cv')
  ) docs ON true
  LEFT JOIN LATERAL (
    SELECT status FROM payments p
    WHERE p.application_id = a.id
    ORDER BY created_at DESC LIMIT 1
  ) pay ON true
) calc
WHERE a.id = calc.id
  AND a.status NOT IN ('Rejected', 'Approved');
