/*
  # Update photo download trigger for newline-separated IDs
  
  1. Changes
    - Modify trigger to handle newline-separated image IDs
    - Improve error handling and validation
    - Add support for both single IDs and multiple IDs
    
  2. Features
    - Split input string by newlines
    - Remove empty lines and whitespace
    - Process each ID individually
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  image_ids TEXT[];
  image_id TEXT;
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
      -- Get public URL for the image
      SELECT storage.fspath(id)
      INTO public_url
      FROM storage.objects
      WHERE bucket_id = 'editorial-images' 
      AND id = image_id;

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