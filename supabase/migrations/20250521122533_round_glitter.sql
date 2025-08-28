/*
  # Fix photo download trigger function
  
  1. Changes
    - Properly handle both array and string inputs
    - Correctly construct storage URLs
    - Verify image existence before adding
    - Handle edge cases and errors gracefully
    
  2. Features
    - Support for both JSON array and newline-separated string inputs
    - Validation of image existence in storage
    - Proper URL construction using project URL
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  image_ids TEXT[];
  image_id TEXT;
  bucket_name TEXT := 'editorial-images';
  base_url TEXT;
  input_text TEXT;
BEGIN
  IF NEW.photo_download IS NOT NULL THEN
    -- Get base URL from project settings
    base_url := rtrim(current_setting('supabase.project_url', true), '/');
    
    -- Handle different input formats
    CASE jsonb_typeof(NEW.photo_download)
      WHEN 'array' THEN
        -- If it's a JSON array, convert to text array
        SELECT array_agg(DISTINCT elem::text)
        INTO image_ids
        FROM jsonb_array_elements_text(NEW.photo_download) AS elem
        WHERE length(trim(elem)) > 0;
      
      WHEN 'string' THEN
        -- If it's a string, split by newlines
        input_text := NEW.photo_download#>>'{}';
        SELECT array_agg(DISTINCT trim(elem))
        INTO image_ids
        FROM unnest(string_to_array(input_text, E'\n')) AS elem
        WHERE length(trim(elem)) > 0;
      
      ELSE
        -- For any other type, initialize as empty array
        image_ids := ARRAY[]::TEXT[];
    END CASE;

    -- Initialize images array if null
    IF NEW.images IS NULL THEN
      NEW.images := '[]'::jsonb;
    END IF;

    -- Process each image ID
    IF image_ids IS NOT NULL THEN
      FOREACH image_id IN ARRAY image_ids
      LOOP
        -- Check if the image exists in storage
        IF EXISTS (
          SELECT 1
          FROM storage.objects
          WHERE bucket_id = bucket_name
          AND name = image_id
        ) THEN
          -- Add new image to the images array with constructed URL
          NEW.images := NEW.images || jsonb_build_object(
            'url', base_url || '/storage/v1/object/public/' || bucket_name || '/' || image_id,
            'filename', image_id,
            'uploaded_at', CURRENT_TIMESTAMP
          );
        END IF;
      END LOOP;
    END IF;

    -- Clear the photo_download field
    NEW.photo_download := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS process_photo_download_trigger ON editorial_calendar;
CREATE TRIGGER process_photo_download_trigger
  BEFORE UPDATE OF photo_download
  ON editorial_calendar
  FOR EACH ROW
  WHEN (NEW.photo_download IS DISTINCT FROM OLD.photo_download)
  EXECUTE FUNCTION process_photo_download();