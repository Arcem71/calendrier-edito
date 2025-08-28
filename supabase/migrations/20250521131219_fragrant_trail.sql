/*
  # Fix photo download trigger function
  
  1. Changes
    - Completely rewrite the trigger function
    - Better handling of newline-separated IDs
    - Improved URL construction
    - More robust error handling
    
  2. Features
    - Supports both string and array inputs
    - Validates image existence in storage
    - Properly constructs storage URLs
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
  -- Early exit if photo_download is null
  IF NEW.photo_download IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get base URL from project settings
  base_url := rtrim(current_setting('supabase.project_url', true), '/');

  -- Convert input to text array, handling both string and array inputs
  CASE jsonb_typeof(NEW.photo_download)
    WHEN 'string' THEN
      -- Split string by any combination of newlines and carriage returns
      SELECT array_agg(DISTINCT elem)
      INTO image_ids
      FROM (
        SELECT trim(elem) as elem
        FROM regexp_split_to_table(NEW.photo_download#>>'{}', E'[\n\r]+') AS elem
        WHERE length(trim(elem)) > 0
      ) AS cleaned;
      
    WHEN 'array' THEN
      -- Convert JSON array to text array
      SELECT array_agg(DISTINCT trim(elem::text))
      INTO image_ids
      FROM jsonb_array_elements_text(NEW.photo_download) AS elem
      WHERE length(trim(elem)) > 0;
      
    ELSE
      -- For any other type, initialize as empty array
      image_ids := ARRAY[]::TEXT[];
  END CASE;

  -- Ensure images is a valid JSONB array
  IF NEW.images IS NULL OR NEW.images = 'null'::jsonb OR NEW.images = '{}'::jsonb THEN
    NEW.images := '[]'::jsonb;
  END IF;

  -- Process each image ID
  IF image_ids IS NOT NULL THEN
    FOREACH image_id IN ARRAY image_ids
    LOOP
      -- Check if image exists in storage
      IF EXISTS (
        SELECT 1
        FROM storage.objects
        WHERE bucket_id = bucket_name
        AND name = image_id
      ) THEN
        -- Add image to array if it doesn't already exist
        IF NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(NEW.images) AS img
          WHERE img->>'filename' = image_id
        ) THEN
          -- Add new image to the images array
          NEW.images := NEW.images || jsonb_build_object(
            'url', base_url || '/storage/v1/object/public/' || bucket_name || '/' || image_id,
            'filename', image_id,
            'uploaded_at', CURRENT_TIMESTAMP
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Clear the photo_download field
  NEW.photo_download := NULL;
  
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