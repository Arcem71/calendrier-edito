/*
  # Create Chat History Table
  
  1. New Tables
    - `n8n_chat_histories`
      - `id` (integer, primary key)
      - `session_id` (varchar, required)
      - `message` (jsonb, required)
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL
);

ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view chat history"
  ON n8n_chat_histories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create chat history"
  ON n8n_chat_histories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);