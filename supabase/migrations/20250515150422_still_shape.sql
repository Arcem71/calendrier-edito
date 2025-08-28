-- Create the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  url_array JSONB := '[]'::jsonb;
BEGIN
  IF NEW.photo_download IS NOT NULL THEN
    -- Handle string input (newline-separated URLs)
    IF jsonb_typeof(NEW.photo_download) = 'string' THEN
      WITH split_urls AS (
        SELECT DISTINCT trim(url) as url
        FROM unnest(string_to_array(NEW.photo_download#>>'{}', E'\n')) AS url
        WHERE url IS NOT NULL AND length(trim(url)) > 0
      )
      SELECT jsonb_agg(
        jsonb_build_object(
          'url', url,
          'filename', split_part(url, '/', -1),
          'uploaded_at', CURRENT_TIMESTAMP
        )
      )
      INTO url_array
      FROM split_urls;
    END IF;

    -- Only update images if we have valid URLs
    IF url_array IS NOT NULL AND jsonb_array_length(url_array) > 0 THEN
      NEW.images := COALESCE(NEW.images, '[]'::jsonb) || url_array;
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