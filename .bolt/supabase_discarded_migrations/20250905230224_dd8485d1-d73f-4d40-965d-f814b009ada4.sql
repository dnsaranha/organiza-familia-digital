-- Add column to store single Pluggy item (backwards compatible with current code)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pluggy_item_id TEXT;

-- Create table to support multiple Pluggy connections per user
CREATE TABLE IF NOT EXISTS public.pluggy_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  institution_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.pluggy_items ENABLE ROW LEVEL SECURITY;

-- Unique constraint to avoid duplicates per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_pluggy_items_user_item
ON public.pluggy_items(user_id, item_id);

-- RLS policies: users can manage only their own items
CREATE POLICY IF NOT EXISTS "Users can view their own pluggy items"
ON public.pluggy_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own pluggy items"
ON public.pluggy_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own pluggy items"
ON public.pluggy_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own pluggy items"
ON public.pluggy_items
FOR DELETE
USING (auth.uid() = user_id);
