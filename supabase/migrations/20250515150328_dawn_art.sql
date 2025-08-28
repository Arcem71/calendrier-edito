/*
  # Fix photo download trigger for newline-separated URLs
  
  1. Changes
    - Improve handling of newline-separated URLs
    - Fix string parsing and array aggregation
    - Better error handling for malformed inputs
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  url_array JSONB;
  single_url TEXT;
BEGIN
  IF NEW.photo_download IS NOT NULL AND (OLD.photo_download IS NULL OR NEW.photo_download != OLD.photo_download) THEN
    -- Handle string input (including newline-separated URLs)
    IF jsonb_typeof(NEW.photo_download) = 'string' THEN
      -- Split the string by newlines and create an array of URLs
      WITH split_urls AS (
        SELECT trim(unnest(string_to_array(NEW.photo_download#>>'{}', E'\n'))) AS url
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
      
    -- Handle array input
    ELSIF jsonb_typeof(NEW.photo_download) = 'array' THEN
      WITH processed_urls AS (
        SELECT 
          CASE 
            WHEN jsonb_typeof(url) = 'object' AND url->>'url' IS NOT NULL 
              THEN url->>'url'
            WHEN jsonb_typeof(url) = 'string' 
              THEN url#>>'{}'
          END AS clean_url
        FROM jsonb_array_elements(NEW.photo_download) AS url
        WHERE 
          CASE 
            WHEN jsonb_typeof(url) = 'object' AND url->>'url' IS NOT NULL 
              THEN true
            WHEN jsonb_typeof(url) = 'string' AND url#>>'{}' IS NOT NULL 
              THEN true
            ELSE false
          END
      )
      SELECT jsonb_agg(
        jsonb_build_object(
          'url', clean_url,
          'filename', split_part(clean_url, '/', -1),
          'uploaded_at', CURRENT_TIMESTAMP
        )
      )
      INTO url_array
      FROM processed_urls;
      
    -- Handle single object input
    ELSIF jsonb_typeof(NEW.photo_download) = 'object' AND NEW.photo_download->>'url' IS NOT NULL THEN
      single_url := NEW.photo_download->>'url';
      url_array := jsonb_build_array(
        jsonb_build_object(
          'url', single_url,
          'filename', split_part(single_url, '/', -1),
          'uploaded_at', CURRENT_TIMESTAMP
        )
      );
    END IF;

    -- Merge new images with existing ones if we have valid URLs
    IF url_array IS NOT NULL AND jsonb_array_length(url_array) > 0 THEN
      NEW.images := COALESCE(NEW.images, '[]'::jsonb) || url_array;
    END IF;
    
    -- Clear the photo_download field after processing
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