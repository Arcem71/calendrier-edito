/*
  # Add image storage support

  1. Changes
    - Add image_url column to editorial_calendar table
    - Enable RLS on editorial_calendar table
    - Add RLS policies for editorial_calendar table

  2. Security
    - Enable RLS on editorial_calendar table
    - Add policies for authenticated users to manage their content
*/

-- Add image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editorial_calendar' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE editorial_calendar ADD COLUMN image_url text;
  END IF;
END $$;

-- Enable RLS on editorial_calendar table
ALTER TABLE editorial_calendar ENABLE ROW LEVEL SECURITY;

-- Policy for reading content (allow all authenticated users)
CREATE POLICY "Allow authenticated users to view content"
ON editorial_calendar FOR SELECT
TO authenticated
USING (true);

-- Policy for creating content (allow all authenticated users)
CREATE POLICY "Allow authenticated users to create content"
ON editorial_calendar FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for updating content (allow all authenticated users)
CREATE POLICY "Allow authenticated users to update content"
ON editorial_calendar FOR UPDATE
TO authenticated
USING (true);

-- Policy for deleting content (allow all authenticated users)
CREATE POLICY "Allow authenticated users to delete content"
ON editorial_calendar FOR DELETE
TO authenticated
USING (true);