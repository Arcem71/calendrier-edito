/*
  # Create search_request table for prospection
  
  1. New Tables
    - `search_request`
      - `id` (uuid, primary key)
      - `nom` (text)
      - `secteur` (text)
      - `entreprise` (text)
      - `profil_link` (text)
      - `mbti` (text)
      - `message` (text)
      - `etat` (text)
      - `bio` (text)
      - `created_at` (timestamptz, default now())
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE search_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text,
  secteur text,
  entreprise text,
  profil_link text,
  mbti text,
  message text,
  etat text,
  bio text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE search_request ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view search requests"
  ON search_request
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create search requests"
  ON search_request
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update search requests"
  ON search_request
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete search requests"
  ON search_request
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better query performance
CREATE INDEX search_request_secteur_idx ON search_request(secteur);
CREATE INDEX search_request_created_at_idx ON search_request(created_at DESC);