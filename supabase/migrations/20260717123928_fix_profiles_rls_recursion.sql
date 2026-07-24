/*
# Fix infinite recursion in profiles RLS policies

The admin-scoped policies on `profiles` (and applications/documents/payments)
used `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)`
inside policies ON profiles — querying the same table under RLS causes
infinite recursion.

Fix: use `auth.uid()` + a direct `is_admin` check on the current row for
profiles, and use `security definer` helper functions for the other tables
so they don't reference profiles under RLS.
*/

-- Helper function: is the current user an admin?
-- Runs as SECURITY DEFINER (the owner), bypassing RLS, so it can read
-- profiles.is_admin without triggering recursion.
DROP FUNCTION IF EXISTS public.is_current_user_admin();
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  );
$$;

-- Fix profiles SELECT (replace admin_select_profiles)
DROP POLICY IF EXISTS "admin_select_profiles" ON profiles;
CREATE POLICY "admin_select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR public.is_current_user_admin()
  );

-- Fix applications admin policies
DROP POLICY IF EXISTS "admin_select_applications" ON applications;
CREATE POLICY "admin_select_applications" ON applications FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "admin_update_applications" ON applications;
CREATE POLICY "admin_update_applications" ON applications FOR UPDATE
  TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Fix documents admin policy
DROP POLICY IF EXISTS "admin_select_documents" ON documents;
CREATE POLICY "admin_select_documents" ON documents FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_current_user_admin()
  );

-- Fix payments admin policy
DROP POLICY IF EXISTS "admin_select_payments" ON payments;
CREATE POLICY "admin_select_payments" ON payments FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_current_user_admin()
  );
