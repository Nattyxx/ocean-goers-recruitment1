/*
# Ocean Goers Recruitment Portal — Initial Schema

Creates the core data model for a cruise ship recruitment platform where
applicants register, upload documents, track their application pipeline,
and receive notifications. Admins manage applications and verify documents.

## 1. New Tables

### profiles
Extends `auth.users` with applicant-facing data.
- `id` (uuid, PK, FK -> auth.users, ON DELETE CASCADE)
- `full_name` (text)
- `phone` (text)
- `avatar_url` (text) — profile picture URL (Supabase Storage path)
- `position` (text) — desired cruise ship role
- `experience_years` (int)
- `notes` (text)
- `profile_complete` (bool, default false)
- `last_login` (timestamptz)
- `created_at` / `updated_at` (timestamptz)

### applications
A user's job application and its pipeline status.
- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles, ON DELETE CASCADE, DEFAULT auth.uid())
- `position` (text)
- `status` (text, default 'Pending') — Pending | Under Review | Interview | Medical | Visa Processing | Approved | Rejected
- `current_step` (int, default 1) — 1..7 index into the tracking timeline
- `submitted_at` (timestamptz)
- `updated_at` (timestamptz)

### documents
Uploaded verification documents (passport, CV, medical, etc.).
- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles, DEFAULT auth.uid())
- `application_id` (uuid, FK -> applications, ON DELETE CASCADE)
- `doc_type` (text) — passport | cv | medical | seaman_book | stcw | police_clearance | education | photo | receipt
- `file_name` (text)
- `file_url` (text) — Supabase Storage public URL
- `file_size` (bigint)
- `mime_type` (text)
- `status` (text, default 'Pending') — Pending | Verified | Rejected
- `uploaded_at` (timestamptz)

### notifications
Per-user notification center entries.
- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles, DEFAULT auth.uid())
- `type` (text) — message | interview | missing_document | payment | visa | application
- `title` (text)
- `message` (text)
- `read` (bool, default false)
- `created_at` (timestamptz)

### payments
Registration fee payment records and receipt uploads.
- `id` (uuid, PK)
- `user_id` (uuid, FK -> profiles, DEFAULT auth.uid())
- `application_id` (uuid, FK -> applications, ON DELETE CASCADE)
- `amount` (numeric, default 5000)
- `currency` (text, default 'ETB')
- `method` (text) — CBE | Telebirr | M-PESA | Chapa
- `receipt_url` (text) — uploaded receipt file URL
- `status` (text, default 'Pending') — Pending | Verified | Rejected
- `created_at` (timestamptz)

## 2. Security (RLS)

All tables have RLS enabled. This app has a sign-in screen, so policies are
scoped to `authenticated` with ownership checks via `auth.uid()`:
- profiles: user can read/update own row (id = auth.uid()).
- applications: full CRUD scoped to user_id = auth.uid().
- documents: full CRUD scoped to user_id = auth.uid().
- notifications: full CRUD scoped to user_id = auth.uid().
- payments: full CRUD scoped to user_id = auth.uid().

Owner columns default to `auth.uid()` so inserts that omit user_id succeed.

## 3. Notes

- `auth.users` is managed by Supabase Auth; we do not create it.
- Email confirmation stays OFF per project defaults.
- All timestamps default to now().
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  position text,
  experience_years int DEFAULT 0,
  notes text,
  profile_complete boolean DEFAULT false,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- applications
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  position text,
  status text DEFAULT 'Pending',
  current_step int DEFAULT 1,
  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications" ON applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_applications" ON applications;
CREATE POLICY "insert_own_applications" ON applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_applications" ON applications;
CREATE POLICY "update_own_applications" ON applications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_applications" ON applications;
CREATE POLICY "delete_own_applications" ON applications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  status text DEFAULT 'Pending',
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  amount numeric DEFAULT 5000,
  currency text DEFAULT 'ETB',
  method text,
  receipt_url text,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- indexes
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
