/*
  # Add support for multiple images
  
  1. Changes
    - Add new JSONB array column for storing multiple images
    - Migrate existing single image data to new format
    - Add validation for image data structure
    
  2. Table Structure Updates
    - Add images JSONB[] column
    - Preserve existing image_url data
*/

-- Add new images column
ALTER TABLE editorial_calendar 
ADD COLUMN IF NOT EXISTS images JSONB[];

-- Create a function to validate image structure
CREATE OR REPLACE FUNCTION validate_image_structure(image JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    image->>'url' IS NOT NULL AND
    image->>'filename' IS NOT NULL AND
    image->>'uploaded_at' IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to validate the entire images array
CREATE OR REPLACE FUNCTION validate_images_array(images JSONB[])
RETURNS BOOLEAN AS $$
DECLARE
  image_item JSONB;
BEGIN
  IF images IS NULL THEN
    RETURN TRUE;
  END IF;
  
  FOREACH image_item IN ARRAY images
  LOOP
    IF NOT validate_image_structure(image_item) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint using the validation function
ALTER TABLE editorial_calendar
ADD CONSTRAINT valid_images_structure
CHECK (validate_images_array(images));

-- Migrate existing image_url data to new images column
UPDATE editorial_calendar
SET images = ARRAY[jsonb_build_object(
  'url', image_url,
  'filename', split_part(image_url, '/', -1),
  'uploaded_at', CURRENT_TIMESTAMP
)]
WHERE image_url IS NOT NULL;