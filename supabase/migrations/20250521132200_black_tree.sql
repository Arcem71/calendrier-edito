/*
  # Update photo download trigger for direct URL construction
  
  1. Changes
    - Simplify URL construction
    - Handle newline-separated filenames
    - Create direct storage URLs
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  filenames TEXT[];
  filename TEXT;
BEGIN
  -- Early exit if photo_download is null
  IF NEW.photo_download IS NULL THEN
    RETURN NEW;
  END IF;

  -- Split input by newlines and clean up
  SELECT array_agg(DISTINCT elem)
  INTO filenames
  FROM (
    SELECT trim(regexp_replace(elem, '\r$', '')) as elem
    FROM regexp_split_to_table(NEW.photo_download#>>'{}', E'[\n\r]+') AS elem
    WHERE length(trim(regexp_replace(elem, '\r$', ''))) > 0
  ) AS cleaned;

  -- Initialize images as empty array if null or invalid
  IF NEW.images IS NULL OR NEW.images = 'null'::jsonb OR NEW.images = '{}'::jsonb OR jsonb_typeof(NEW.images) != 'array' THEN
    NEW.images := '[]'::jsonb;
  END IF;

  -- Process each filename
  IF filenames IS NOT NULL THEN
    FOREACH filename IN ARRAY filenames
    LOOP
      -- Add the image with direct URL construction
      NEW.images := NEW.images || jsonb_build_object(
        'url', rtrim(current_setting('supabase.project_url', true), '/') || '/storage/v1/object/public/editorial-images/' || filename,
        'filename', filename,
        'uploaded_at', CURRENT_TIMESTAMP
      );
    END LOOP;
  END IF;

  -- Clear the photo_download field
  NEW.photo_download := NULL;
  
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