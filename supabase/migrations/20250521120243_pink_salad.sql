/*
  # Fix photo download trigger to use storage.get_public_url
  
  1. Changes
    - Replace storage.fspath with storage.get_public_url
    - Improve error handling for missing images
    - Better handling of newline-separated IDs
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  image_ids TEXT[];
  image_id TEXT;
  bucket_name TEXT := 'editorial-images';
  public_url TEXT;
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

    -- Process each image ID
    FOREACH image_id IN ARRAY image_ids
    LOOP
      -- Get public URL for the image using storage.get_public_url
      SELECT storage.get_public_url(bucket_name, image_id) INTO public_url;

      IF public_url IS NOT NULL THEN
        -- Add new image to the images array
        NEW.images := NEW.images || jsonb_build_object(
          'url', public_url,
          'filename', image_id,
          'uploaded_at', CURRENT_TIMESTAMP
        );
      END IF;
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