-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to create chat history" ON public.history_chat;
DROP POLICY IF EXISTS "Allow authenticated users to view chat history" ON public.history_chat;
DROP POLICY IF EXISTS "Allow authenticated users to update chat history" ON public.history_chat;
DROP POLICY IF EXISTS "Allow authenticated users to delete chat history" ON public.history_chat;

-- Drop the existing table if it exists
DROP TABLE IF EXISTS public.history_chat;

-- Create the chat history table
CREATE TABLE public.history_chat (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for session_id
CREATE INDEX IF NOT EXISTS history_chat_session_id_idx ON public.history_chat (session_id);

-- Enable RLS
ALTER TABLE public.history_chat ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to create chat history"
  ON public.history_chat
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view chat history"
  ON public.history_chat
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update chat history"
  ON public.history_chat
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete chat history"
  ON public.history_chat
  FOR DELETE
  TO authenticated
  USING (true);