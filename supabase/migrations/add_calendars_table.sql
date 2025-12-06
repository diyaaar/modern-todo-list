-- Create calendars table for multiple calendar support
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_primary BOOLEAN DEFAULT false,
  google_calendar_id TEXT, -- Google Calendar ID if synced
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own calendars
CREATE POLICY "Users can manage their own calendars"
  ON calendars
  FOR ALL
  USING (auth.uid() = user_id);

-- Add calendar_id to google_calendar_tokens (optional, for tracking which calendar the tokens belong to)
ALTER TABLE google_calendar_tokens
ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL;

-- Add calendar_id to events (we'll need to track which calendar each event belongs to)
-- Note: This assumes events are stored locally. If events come only from Google Calendar API,
-- we might need a different approach - storing calendar_id in a separate mapping table.

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendars_google_calendar_id ON calendars(google_calendar_id);

-- Add comment
COMMENT ON TABLE calendars IS 'User calendars for organizing events. Each user can have multiple calendars with different colors.';

