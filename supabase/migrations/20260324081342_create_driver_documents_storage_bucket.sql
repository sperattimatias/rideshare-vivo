/*
  # Create storage bucket for driver documents

  1. Bucket Creation
    - Creates `driver-documents` bucket for storing driver verification files
    - Public access disabled for security (files accessible only via signed URLs or policies)

  2. Storage Policies
    - Authenticated drivers can upload their own documents
    - Authenticated drivers can read their own documents
    - Admin users can read all documents
    - Public cannot access any documents

  3. File Types
    - Supports: images (jpg, jpeg, png, webp) and PDFs
    - Used for: vehicle photos, driver licenses, registrations, insurance documents
*/

-- Create the driver-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Drivers can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can delete own documents" ON storage.objects;

-- Policy: Allow authenticated users to upload their own documents
CREATE POLICY "Drivers can upload own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to read their own documents
CREATE POLICY "Drivers can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Allow authenticated users to update their own documents
CREATE POLICY "Drivers can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'driver-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own documents
CREATE POLICY "Drivers can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
