/*
# Storage policies for documents bucket

Allows authenticated users to upload/read/delete files in their own folder
within the `documents` storage bucket (avatars and document files).

## Security
- SELECT (read): public, since files need to be viewable by applicant and admin
- INSERT/UPDATE/DELETE: only the owner, scoped by user ID in the file path
*/

DROP POLICY IF EXISTS "Public read documents bucket" ON storage.objects;
CREATE POLICY "Public read documents bucket" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Auth upload own documents" ON storage.objects;
CREATE POLICY "Auth upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth update own documents" ON storage.objects;
CREATE POLICY "Auth update own documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth delete own documents" ON storage.objects;
CREATE POLICY "Auth delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
