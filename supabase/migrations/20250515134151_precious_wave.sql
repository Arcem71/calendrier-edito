/*
  # Synchronize image_url with images column
  
  1. Changes
    - Create trigger function to sync image_url to images
    - Handle both single URLs and JSON arrays
    - Migrate existing data
    
  2. Type Handling
    - Properly cast between JSONB and JSONB[]
    - Handle JSON parsing errors
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION sync_image_url_to_images()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.image_url IS NOT NULL AND (OLD.image_url IS NULL OR NEW.image_url != OLD.image_url) THEN
    -- Try to parse image_url as JSON
    BEGIN
      -- If it's a valid JSON array, use it directly
      IF jsonb_typeof(NEW.image_url::jsonb) = 'array' THEN
        NEW.images = ARRAY[NEW.image_url::jsonb];
      -- If it's a single URL
      ELSE
        NEW.images = ARRAY[jsonb_build_object(
          'url', NEW.image_url,
          'filename', split_part(NEW.image_url, '/', -1),
          'uploaded_at', CURRENT_TIMESTAMP
        )];
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If JSON parsing fails, treat it as a single URL
      NEW.images = ARRAY[jsonb_build_object(
        'url', NEW.image_url,
        'filename', split_part(NEW.image_url, '/', -1),
        'uploaded_at', CURRENT_TIMESTAMP
      )];
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_image_url_trigger ON editorial_calendar;
CREATE TRIGGER sync_image_url_trigger
  BEFORE UPDATE OF image_url
  ON editorial_calendar
  FOR EACH ROW
  WHEN (NEW.image_url IS DISTINCT FROM OLD.image_url)
  EXECUTE FUNCTION sync_image_url_to_images();

-- Migrate existing image_url data to images
DO $$
BEGIN
  UPDATE editorial_calendar
  SET images = ARRAY[
    CASE 
      WHEN jsonb_typeof(image_url::jsonb) = 'array' THEN image_url::jsonb
      ELSE jsonb_build_object(
        'url', image_url,
        'filename', split_part(image_url, '/', -1),
        'uploaded_at', CURRENT_TIMESTAMP
      )
    END
  ]
  WHERE image_url IS NOT NULL
    AND (images IS NULL OR images = '{}');
END $$;