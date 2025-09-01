-- 1. Create the user_preferences table
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start_day INTEGER NOT NULL DEFAULT 1,
  carry_over_balance BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS for the new table
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for the user_preferences table
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Create a function to handle new user creation and add default preferences
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- 5. Create a trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created_add_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_preferences();
