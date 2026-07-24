/*
# Add phone to applications and sync to profiles on submission

1. Schema changes
- Add `phone text` column to `applications`. This captures the phone number
  entered by the applicant when submitting their application.

2. Trigger
- Create `sync_application_phone_to_profile()` trigger function that fires
  AFTER INSERT or UPDATE on `applications`. When the application has a
  non-null, non-empty phone, it updates `profiles.phone` for the matching
  user_id. This makes the phone number appear in the profile overview on
  the dashboard automatically once the application is submitted.

3. Notes
- Idempotent: uses IF NOT EXISTS for the column add and DROP IF EXISTS
  for the trigger/function.
- Non-destructive: no data is lost.
*/

ALTER TABLE applications ADD COLUMN IF NOT EXISTS phone text;

DROP TRIGGER IF EXISTS trg_sync_app_phone ON applications;
DROP FUNCTION IF EXISTS sync_application_phone_to_profile();

CREATE OR REPLACE FUNCTION sync_application_phone_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND trim(NEW.phone) <> '' THEN
    UPDATE profiles
    SET phone = NEW.phone, updated_at = now()
    WHERE id = NEW.user_id
      AND (phone IS NULL OR trim(phone) = '' OR phone <> NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_app_phone
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION sync_application_phone_to_profile();
