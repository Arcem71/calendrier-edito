/*
  # Update Editorial Calendar Table
  
  1. Changes
    - Remove user authentication requirements
    - Simplify table structure
    - Add status validation
    
  2. Table Structure
    - id (uuid, primary key)
    - nom (text)
    - statut (text)
    - date_brute (date)
    - description (text)
    - platformes (text)
*/

-- Drop the existing table if it exists
DROP TABLE IF EXISTS editorial_calendar;

-- Create the editorial calendar table
CREATE TABLE editorial_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text,
  statut text,
  date_brute date,
  description text,
  platformes text,
  CONSTRAINT valid_status CHECK (statut IN ('draft', 'in-progress', 'review', 'scheduled', 'published'))
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';