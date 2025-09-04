/*
  # Create Publication Ideas Table
  
  1. New Tables
    - `publication_ideas`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, not null)
      - `category` (text)
      - `priority` (text) - 'low', 'medium', 'high'
      - `status` (text) - 'idea', 'in_progress', 'generated', 'published', 'archived'
      - `tags` (text array)
      - `target_platforms` (text array)
      - `target_date` (date)
      - `inspiration_source` (text)
      - `notes` (text)
      - `generated_content` (jsonb)
      - `is_favorite` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE publication_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'idea' CHECK (status IN ('idea', 'in_progress', 'generated', 'published', 'archived')),
  tags text[] DEFAULT '{}',
  target_platforms text[] DEFAULT '{}',
  target_date date,
  inspiration_source text,
  notes text,
  generated_content jsonb,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE publication_ideas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view ideas"
  ON publication_ideas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create ideas"
  ON publication_ideas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ideas"
  ON publication_ideas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete ideas"
  ON publication_ideas
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX publication_ideas_status_idx ON publication_ideas(status);
CREATE INDEX publication_ideas_category_idx ON publication_ideas(category);
CREATE INDEX publication_ideas_priority_idx ON publication_ideas(priority);
CREATE INDEX publication_ideas_created_at_idx ON publication_ideas(created_at DESC);
CREATE INDEX publication_ideas_target_date_idx ON publication_ideas(target_date);
CREATE INDEX publication_ideas_is_favorite_idx ON publication_ideas(is_favorite);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_publication_ideas_updated_at
    BEFORE UPDATE ON publication_ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();