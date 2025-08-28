/*
  # Create Dashboard Images Bucket
  
  1. Changes
    - Create new 'dashboard' bucket for storing dashboard-specific images
    - Add appropriate storage policies
    
  2. Features
    - Public access for reading images
    - Authenticated access for managing images
*/

-- Create a new public bucket for dashboard images
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard', 'dashboard', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload dashboard images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dashboard');

-- Allow public access to read files
CREATE POLICY "Allow public to read dashboard images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dashboard');