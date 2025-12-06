-- Add color_id column to tasks table
-- This stores the color identifier for tasks, allowing them to remember their color
-- even when moved between workspaces

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS color_id INTEGER;

-- Add comment to document the column
COMMENT ON COLUMN tasks.color_id IS 'Color ID (1-11) that maps to workspace colors. Allows tasks to remember their color when moved between workspaces.';

