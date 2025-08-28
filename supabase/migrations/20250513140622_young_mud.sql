/*
  # Add image field to editorial calendar

  1. Changes
    - Add `image_url` column to `editorial_calendar` table
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'editorial_calendar' 
    AND column_name = 'image_url'
  ) THEN 
    ALTER TABLE editorial_calendar ADD COLUMN image_url text;
  END IF;
END $$;