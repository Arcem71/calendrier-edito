-- Add the photo_download column
ALTER TABLE editorial_calendar 
ADD COLUMN IF NOT EXISTS photo_download JSONB;

-- Create the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  new_images JSONB;
BEGIN
  IF NEW.photo_download IS NOT NULL AND (OLD.photo_download IS NULL OR NEW.photo_download != OLD.photo_download) THEN
    -- Initialize new_images as an empty array if images is null
    new_images := COALESCE(NEW.images, '[]'::jsonb);
    
    -- Handle different input formats
    CASE jsonb_typeof(NEW.photo_download)
      -- Handle array of objects with url field
      WHEN 'array' THEN
        SELECT jsonb_agg(
          jsonb_build_object(
            'url', CASE 
              WHEN jsonb_typeof(url) = 'object' THEN url->>'url'
              ELSE url#>>'{}'
            END,
            'filename', split_part(
              CASE 
                WHEN jsonb_typeof(url) = 'object' THEN url->>'url'
                ELSE url#>>'{}'
              END,
              '/',
              -1
            ),
            'uploaded_at', CURRENT_TIMESTAMP
          )
        )
        INTO new_images
        FROM jsonb_array_elements(NEW.photo_download) AS url;
        
      -- Handle single URL as string
      WHEN 'string' THEN
        new_images := jsonb_build_array(
          jsonb_build_object(
            'url', NEW.photo_download#>>'{}',
            'filename', split_part(NEW.photo_download#>>'{}', '/', -1),
            'uploaded_at', CURRENT_TIMESTAMP
          )
        );
        
      -- Handle single object with url field
      WHEN 'object' THEN
        new_images := jsonb_build_array(
          jsonb_build_object(
            'url', NEW.photo_download->>'url',
            'filename', split_part(NEW.photo_download->>'url', '/', -1),
            'uploaded_at', CURRENT_TIMESTAMP
          )
        );
    END CASE;

    -- Merge new images with existing ones
    NEW.images := COALESCE(NEW.images, '[]'::jsonb) || new_images;
    
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