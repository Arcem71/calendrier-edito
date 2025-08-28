/*
  # Add search_request field to search_request table
  
  1. Changes
    - Add search_request column to store the original search query
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'search_request' 
    AND column_name = 'search_request'
  ) THEN
    ALTER TABLE search_request ADD COLUMN search_request text;
  END IF;
END $$;