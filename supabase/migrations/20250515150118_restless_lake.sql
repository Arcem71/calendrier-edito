-- Add the photo_download column
ALTER TABLE editorial_calendar 
ADD COLUMN IF NOT EXISTS photo_download JSONB;

-- Create the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  url_array JSONB;
  url_text TEXT;
BEGIN
  IF NEW.photo_download IS NOT NULL AND (OLD.photo_download IS NULL OR NEW.photo_download != OLD.photo_download) THEN
    -- Convert input to JSONB array regardless of format
    CASE jsonb_typeof(NEW.photo_download)
      -- If it's already an array, use it directly
      WHEN 'array' THEN
        url_array := NEW.photo_download;
        
      -- If it's a string, split by newlines and convert to array
      WHEN 'string' THEN
        url_text := NEW.photo_download#>>'{}';
        WITH split_urls AS (
          SELECT unnest(string_to_array(url_text, E'\n')) AS url
          WHERE url IS NOT NULL AND length(trim(url)) > 0
        )
        SELECT jsonb_agg(url)
        INTO url_array
        FROM split_urls;
        
      -- If it's an object with url field, wrap in array
      WHEN 'object' THEN
        url_array := jsonb_build_array(NEW.photo_download);
        
      ELSE
        url_array := '[]'::jsonb;
    END CASE;

    -- Process each URL and create image objects
    WITH processed_urls AS (
      SELECT jsonb_build_object(
        'url', 
        CASE 
          WHEN jsonb_typeof(url) = 'object' THEN url->>'url'
          ELSE url#>>'{}'
        END,
        'filename',
        split_part(
          CASE 
            WHEN jsonb_typeof(url) = 'object' THEN url->>'url'
            ELSE url#>>'{}'
          END,
          '/',
          -1
        ),
        'uploaded_at',
        CURRENT_TIMESTAMP
      ) AS image_object
      FROM jsonb_array_elements(url_array) AS url
      WHERE CASE 
        WHEN jsonb_typeof(url) = 'object' THEN url->>'url' IS NOT NULL
        ELSE url#>>'{}' IS NOT NULL
      END
    )
    SELECT jsonb_agg(image_object)
    INTO url_array
    FROM processed_urls;

    -- Merge new images with existing ones
    NEW.images := COALESCE(NEW.images, '[]'::jsonb) || COALESCE(url_array, '[]'::jsonb);
    
    -- Clear the photo_download field after processing
    NEW.photo_download := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS process_photo_download_trigger ON editorial_calendar;
CREATE TRIGGER process_photo_download_trigger
  BEFORE UPDATE OF photo_download
  ON editorial_calendar
  FOR EACH ROW
  WHEN (NEW.photo_download IS DISTINCT FROM OLD.photo_download)
  EXECUTE FUNCTION process_photo_download();