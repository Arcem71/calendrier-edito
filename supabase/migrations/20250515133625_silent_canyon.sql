/*
  # Synchronize image_url with images array
  
  1. Changes
    - Add trigger to sync image_url updates to images array
    - Migrate existing image_url data
    
  2. Functions
    - sync_image_url_to_images: Handles the synchronization logic
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION sync_image_url_to_images()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.image_url IS NOT NULL AND (OLD.image_url IS NULL OR NEW.image_url != OLD.image_url) THEN
    NEW.images = ARRAY[jsonb_build_object(
      'url', NEW.image_url,
      'filename', split_part(NEW.image_url, '/', -1),
      'uploaded_at', CURRENT_TIMESTAMP
    )];
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

-- Migrate existing image_url data to images array
UPDATE editorial_calendar
SET images = ARRAY[jsonb_build_object(
  'url', image_url,
  'filename', split_part(image_url, '/', -1),
  'uploaded_at', CURRENT_TIMESTAMP
)]
WHERE image_url IS NOT NULL
  AND (images IS NULL OR images = ARRAY[]::jsonb[]);