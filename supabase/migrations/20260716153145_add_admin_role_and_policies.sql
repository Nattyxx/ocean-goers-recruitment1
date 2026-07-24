/*
# Add admin role and admin-scoped RLS policies

1. Schema changes
- Add `is_admin boolean DEFAULT false` to `profiles`. This flag marks a user as an
  administrator who can view and manage all applications.

2. Security (RLS)
- Add admin-scoped SELECT policy on `applications` so admins can read every row.
  (The existing owner-scoped select_own_applications policy remains for regular users.)
- Add admin-scoped UPDATE policy on `applications` so admins can change status/current_step.
- Add admin-scoped SELECT policy on `profiles` so admins can see applicant contact info
  (name, phone, email, position) needed to review applications.
- Add admin-scoped SELECT policy on `documents` so admins can review uploaded files.
- Add admin-scoped SELECT policy on `payments` so admins can verify payment receipts.

3. Notes
- `is_admin` defaults to false for all existing and new users. Promote a user manually
  (e.g. `update profiles set is_admin = true where id = '...'`) to grant admin access.
- Admin predicate helper: `profiles.is_admin = true` for the current `auth.uid()`.
- No destructive changes; all statements are idempotent.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Helper: admin check via EXISTS subquery on profiles
-- Admin SELECT on applications
DROP POLICY IF EXISTS "admin_select_applications" ON applications;
CREATE POLICY "admin_select_applications" ON applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admin UPDATE on applications (status / current_step)
DROP POLICY IF EXISTS "admin_update_applications" ON applications;
CREATE POLICY "admin_update_applications" ON applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admin SELECT on profiles (to view applicant details)
DROP POLICY IF EXISTS "admin_select_profiles" ON profiles;
CREATE POLICY "admin_select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admin SELECT on documents
DROP POLICY IF EXISTS "admin_select_documents" ON documents;
CREATE POLICY "admin_select_documents" ON documents FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admin SELECT on payments
DROP POLICY IF EXISTS "admin_select_payments" ON payments;
CREATE POLICY "admin_select_payments" ON payments FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
