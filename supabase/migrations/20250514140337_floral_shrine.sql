/*
  # Create History Chat Table
  
  1. New Tables
    - `history_chat`
      - `id` (SERIAL, primary key)
      - `session_id` (VARCHAR(255), not null)
      - `message` (JSONB, not null)
      - `created_at` (TIMESTAMPTZ, default now())
      
  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Create new chat entries
      - View chat history
      - Update chat entries
      - Delete chat entries
*/

-- Create the history_chat table
CREATE TABLE IF NOT EXISTS history_chat (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE history_chat ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to create chat history"
  ON history_chat
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view chat history"
  ON history_chat
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update chat history"
  ON history_chat
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete chat history"
  ON history_chat
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index on session_id for better query performance
CREATE INDEX IF NOT EXISTS history_chat_session_id_idx ON history_chat(session_id);