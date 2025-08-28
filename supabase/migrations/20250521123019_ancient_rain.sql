/*
  # Fix photo download trigger function
  
  1. Changes
    - Complete rewrite of the photo_download trigger
    - Better handling of newline-separated IDs
    - Proper URL construction using project URL
    - Validation of image existence in storage
    
  2. Features
    - Support for both string and array inputs
    - Proper error handling
    - Maintains existing images
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  image_ids TEXT[];
  image_id TEXT;
  bucket_name TEXT := 'editorial-images';
  base_url TEXT;
BEGIN
  -- Get base URL from project settings
  base_url := rtrim(current_setting('supabase.project_url', true), '/');
  
  -- Handle photo_download input
  IF NEW.photo_download IS NOT NULL THEN
    -- Convert input to text array, handling both string and array inputs
    IF jsonb_typeof(NEW.photo_download) = 'string' THEN
      -- Split string by newlines and clean up
      SELECT array_agg(DISTINCT trim(elem))
      INTO image_ids
      FROM unnest(regexp_split_to_array(NEW.photo_download#>>'{}', E'[\n\r]+')) AS elem
      WHERE length(trim(elem)) > 0;
    ELSE
      -- For any other type, try to convert to text array
      BEGIN
        SELECT array_agg(DISTINCT elem::text)
        INTO image_ids
        FROM jsonb_array_elements_text(NEW.photo_download) AS elem
        WHERE length(trim(elem)) > 0;
      EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, initialize as empty array
        image_ids := ARRAY[]::TEXT[];
      END;
    END IF;

    -- Initialize images array if null or invalid
    IF NEW.images IS NULL OR NEW.images = 'null'::jsonb OR NEW.images = '{}'::jsonb THEN
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
          -- Construct the full URL
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