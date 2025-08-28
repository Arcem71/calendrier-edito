/*
  # Create Social Media Statistics Table
  
  1. New Tables
    - `social_media_stats`
      - `id` (uuid, primary key)
      - `month` (date, not null) - First day of the month
      - `instagram_followers` (integer)
      - `instagram_likes` (integer)
      - `facebook_followers` (integer)
      - `facebook_likes` (integer)
      - `linkedin_followers` (integer)
      - `linkedin_likes` (integer)
      - `created_at` (timestamptz, default now())
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE social_media_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  instagram_followers integer,
  instagram_likes integer,
  facebook_followers integer,
  facebook_likes integer,
  linkedin_followers integer,
  linkedin_likes integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_month UNIQUE (month)
);

-- Enable RLS
ALTER TABLE social_media_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view stats"
  ON social_media_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create stats"
  ON social_media_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index on month for better query performance
CREATE INDEX social_media_stats_month_idx ON social_media_stats(month);