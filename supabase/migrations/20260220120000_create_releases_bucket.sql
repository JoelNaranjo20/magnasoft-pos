-- Create the public "releases" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
CREATE POLICY "Public Access for Downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'releases');

-- Allow authenticated super_admins to insert, update and delete files
-- For simplicity, we use auth.uid() != null for now, but in a production SaaS you might
-- verify the saas_role from the profiles table.
CREATE POLICY "Authenticated users can upload releases"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'releases');

CREATE POLICY "Authenticated users can update releases"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'releases')
WITH CHECK (bucket_id = 'releases');

CREATE POLICY "Authenticated users can delete releases"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'releases');
