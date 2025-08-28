/*
  # Fix photo download trigger to properly construct storage URLs
  
  1. Changes
    - Update trigger function to correctly handle image IDs
    - Properly construct storage URLs using project URL
    - Handle newline-separated image IDs
    
  2. Features
    - Automatically constructs proper storage URLs
    - Maintains image metadata
    - Handles multiple images
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  image_ids TEXT[];
  image_id TEXT;
  bucket_name TEXT := 'editorial-images';
  storage_url TEXT;
BEGIN
  IF NEW.photo_download IS NOT NULL THEN
    -- Split the input string by newlines and remove empty lines
    SELECT ARRAY(
      SELECT DISTINCT trim(unnest)
      FROM unnest(string_to_array(NEW.photo_download#>>'{}', E'\n')) AS unnest
      WHERE length(trim(unnest)) > 0
    ) INTO image_ids;

    -- Initialize images array if null
    IF NEW.images IS NULL THEN
      NEW.images := '[]'::jsonb;
    END IF;

    -- Get the storage URL for this project
    storage_url := rtrim(current_setting('supabase.project_url', true), '/') || '/storage/v1/object/public';

    -- Process each image ID
    FOREACH image_id IN ARRAY image_ids
    LOOP
      -- Add new image to the images array with constructed URL
      NEW.images := NEW.images || jsonb_build_object(
        'url', storage_url || '/' || bucket_name || '/' || image_id,
        'filename', image_id,
        'uploaded_at', CURRENT_TIMESTAMP
      );
    END LOOP;

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