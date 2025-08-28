/*
  # Fix Instagram Stats Table

  1. Drop existing table to avoid conflicts
  2. Create fresh instagram_stats table with proper structure
  3. Set up RLS policies
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.instagram_stats;

-- Create the instagram_stats table with proper structure
CREATE TABLE public.instagram_stats (
  username text PRIMARY KEY,
  media_count integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.instagram_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view instagram stats"
  ON public.instagram_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to update instagram stats"
  ON public.instagram_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default row
INSERT INTO public.instagram_stats (username)
VALUES ('default')
ON CONFLICT (username) DO NOTHING;