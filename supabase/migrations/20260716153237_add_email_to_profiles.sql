/*
# Add email column to profiles for admin visibility

1. Schema changes
- Add `email text` to `profiles`. Populated by the existing `handle_new_user` trigger
  so new signups store their email in the profile row. Existing rows get backfilled
  from auth.users via a one-time UPDATE.

2. Security
- No policy changes needed; the existing admin_select_profiles policy already covers
  the new column.

3. Notes
- Idempotent: uses IF NOT EXISTS for the column add.
- Backfill is safe and non-destructive.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing profiles with their email from auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- Update the trigger function to also store email on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;
