/*
  # Create storage bucket for editorial images

  1. New Storage Bucket
    - Creates a new public bucket called 'editorial-images' for storing content images
  2. Security
    - Enables public access to the bucket
    - Adds policy for authenticated users to upload images
*/

-- Create a new public bucket for editorial images
INSERT INTO storage.buckets (id, name, public)
VALUES ('editorial-images', 'editorial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editorial-images');

-- Allow public access to read files
CREATE POLICY "Allow public to read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'editorial-images');