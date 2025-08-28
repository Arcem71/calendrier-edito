/*
  # Update images column structure
  
  1. Changes
    - Convert images column from JSONB[] to JSONB
    - Add validation for image structure
    - Update constraints
    
  2. Validation
    - Ensure each image has url, filename, and uploaded_at
    - Validate array structure
*/

-- Create the validation function first
CREATE OR REPLACE FUNCTION validate_images_array(images JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  image_item JSONB;
BEGIN
  IF images IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if images is a valid JSON array
  IF jsonb_typeof(images) != 'array' THEN
    RETURN FALSE;
  END IF;

  FOR image_item IN SELECT jsonb_array_elements(images)
  LOOP
    IF NOT (
      image_item->>'url' IS NOT NULL AND
      image_item->>'filename' IS NOT NULL AND
      image_item->>'uploaded_at' IS NOT NULL
    ) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Drop existing constraint if it exists
ALTER TABLE editorial_calendar
DROP CONSTRAINT IF EXISTS valid_images_structure;

-- Convert existing data
UPDATE editorial_calendar 
SET images = COALESCE(to_jsonb(images), '[]'::jsonb)
WHERE images IS NOT NULL;

-- Change column type
ALTER TABLE editorial_calendar 
ALTER COLUMN images TYPE JSONB USING COALESCE(to_jsonb(images), '[]'::jsonb);

-- Add new constraint
ALTER TABLE editorial_calendar
ADD CONSTRAINT valid_images_structure
CHECK (validate_images_array(images));