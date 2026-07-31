/*
# Create pending_registrations table

## Purpose
Stores temporary registration data while awaiting email verification.
A 6-digit OTP is generated and emailed by the verify-email edge function.
Only after the user enters the correct code is a real Supabase Auth account created.

## New Tables
- `pending_registrations`
  - `id` (uuid, pk)
  - `email` (text, unique per email — one pending row per address)
  - `full_name` (text)
  - `password_plain` (text) — held temporarily until the edge function calls auth.admin.createUser
  - `code` (text) — the 6-digit OTP
  - `expires_at` (timestamptz) — 10 minutes from code generation
  - `created_at` (timestamptz)

## Security
- RLS enabled.
- No client-accessible policies; all reads/writes go through the
  verify-email edge function using the service role key, which bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  password_plain text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_registrations_email_unique UNIQUE (email)
);

ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
