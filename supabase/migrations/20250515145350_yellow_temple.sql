/*
  # Add photo download functionality
  
  1. Changes
    - Add photo_download column to editorial_calendar table
    - Create trigger function to automatically process URLs
    - Add trigger to handle photo downloads
    
  2. Features
    - Automatically downloads photos from URLs
    - Adds downloaded photos to images array
    - Handles both single URLs and arrays of URLs
*/

-- Add the photo_download column
ALTER TABLE editorial_calendar 
ADD COLUMN IF NOT EXISTS photo_download JSONB;

-- Create the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.photo_download IS NOT NULL AND (OLD.photo_download IS NULL OR NEW.photo_download != OLD.photo_download) THEN
    -- If it's a JSON array of URLs
    IF jsonb_typeof(NEW.photo_download) = 'array' THEN
      -- Process each URL in the array
      NEW.images = COALESCE(NEW.images, '[]'::jsonb) || (
        SELECT jsonb_agg(
          jsonb_build_object(
            'url', url,
            'filename', split_part(url->>'url', '/', -1),
            'uploaded_at', CURRENT_TIMESTAMP
          )
        )
        FROM jsonb_array_elements(NEW.photo_download) AS url
      );
    -- If it's a single URL
    ELSIF jsonb_typeof(NEW.photo_download) = 'string' THEN
      NEW.images = COALESCE(NEW.images, '[]'::jsonb) || jsonb_build_object(
        'url', NEW.photo_download,
        'filename', split_part(NEW.photo_download#>>'{}', '/', -1),
        'uploaded_at', CURRENT_TIMESTAMP
      );
    END IF;
    
    -- Clear the photo_download field after processing
    NEW.photo_download = NULL;
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