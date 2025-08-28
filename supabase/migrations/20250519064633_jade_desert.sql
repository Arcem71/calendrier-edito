/*
  # Add name column to editorial_calendar table

  1. Changes
    - Add 'name' column to editorial_calendar table
      - Type: text
      - Nullable: true (to maintain compatibility with existing records)

  2. Notes
    - Using DO block with IF NOT EXISTS check for safety
    - No data migration needed as this is a new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'editorial_calendar' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE editorial_calendar ADD COLUMN name text;
  END IF;
END $$;