/*
  # Add Instagram Statistics Table
  
  1. New Tables
    - `instagram_stats`
      - `username` (text, primary key)
      - `media_count` (integer)
      - `total_likes` (integer)
      - `total_comments` (integer)
      - `engagement_rate` (numeric)
      - `last_updated` (timestamptz)
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create instagram_stats table
CREATE TABLE IF NOT EXISTS instagram_stats (
  username text PRIMARY KEY,
  media_count integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE instagram_stats ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow authenticated users to view instagram stats"
  ON instagram_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to update instagram stats"
  ON instagram_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);