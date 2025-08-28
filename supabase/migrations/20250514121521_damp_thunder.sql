/*
  # Create Instagram Stats Table

  1. New Tables
    - `instagram_stats`
      - `username` (text, primary key)
      - `media_count` (integer)
      - `total_likes` (integer)
      - `total_comments` (integer)
      - `engagement_rate` (numeric)
      - `last_updated` (timestamptz)
  2. Security
    - Enable RLS on `instagram_stats` table
    - Add policy for authenticated users to read stats
    - Add policy for service role to manage stats
*/

CREATE TABLE IF NOT EXISTS instagram_stats (
  username text PRIMARY KEY,
  media_count integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE instagram_stats ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'instagram_stats' 
    AND policyname = 'Allow authenticated users to view instagram stats'
  ) THEN
    CREATE POLICY "Allow authenticated users to view instagram stats"
      ON instagram_stats
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'instagram_stats' 
    AND policyname = 'Allow service role to update instagram stats'
  ) THEN
    CREATE POLICY "Allow service role to update instagram stats"
      ON instagram_stats
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;