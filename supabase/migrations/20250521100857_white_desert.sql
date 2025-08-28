/*
  # Update photo download trigger to handle image IDs
  
  1. Changes
    - Modify trigger function to handle image IDs from storage
    - Get public URLs for images from storage bucket
    - Update images array with proper image objects
    
  2. Features
    - Support for single ID or array of IDs
    - Automatic URL generation from storage
    - Proper error handling
*/

-- Update the trigger function
CREATE OR REPLACE FUNCTION process_photo_download()
RETURNS TRIGGER AS $$
DECLARE
  image_ids JSONB;
  image_id TEXT;
  public_url TEXT;
BEGIN
  IF NEW.photo_download IS NOT NULL THEN
    -- Convert input to JSONB array regardless of format
    CASE jsonb_typeof(NEW.photo_download)
      -- If it's already an array, use it directly
      WHEN 'array' THEN
        image_ids := NEW.photo_download;
        
      -- If it's a string, wrap in array
      WHEN 'string' THEN
        image_ids := jsonb_build_array(NEW.photo_download);
        
      ELSE
        image_ids := '[]'::jsonb;
    END CASE;

    -- Initialize images array if null
    IF NEW.images IS NULL THEN
      NEW.images := '[]'::jsonb;
    END IF;

    -- Process each image ID
    FOR image_id IN SELECT jsonb_array_elements_text(image_ids)
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