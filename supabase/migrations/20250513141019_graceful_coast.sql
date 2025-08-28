/*
  # Restore Editorial Calendar Database

  1. Tables
    - `editorial_calendar`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `statut` (text)
      - `date_brute` (date)
      - `description` (text)
      - `platformes` (text)
      - `image_url` (text)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create the editorial_calendar table if it doesn't exist
CREATE TABLE IF NOT EXISTS editorial_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text,
  statut text,
  date_brute date,
  description text,
  platformes text,
  image_url text
);

-- Enable RLS
ALTER TABLE editorial_calendar ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Allow authenticated users to view content" ON editorial_calendar;
DROP POLICY IF EXISTS "Allow authenticated users to create content" ON editorial_calendar;
DROP POLICY IF EXISTS "Allow authenticated users to update content" ON editorial_calendar;
DROP POLICY IF EXISTS "Allow authenticated users to delete content" ON editorial_calendar;

CREATE POLICY "Allow authenticated users to view content"
ON editorial_calendar FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create content"
ON editorial_calendar FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update content"
ON editorial_calendar FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete content"
ON editorial_calendar FOR DELETE
TO authenticated
USING (true);

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('editorial-images', 'editorial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Recreate storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read images" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editorial-images');

CREATE POLICY "Allow public to read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'editorial-images');