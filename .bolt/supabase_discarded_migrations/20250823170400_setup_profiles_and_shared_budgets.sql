-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);


-- 2. Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;


-- 3. Create a trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- 4. Update RLS on transactions table for group visibility
-- Drop the old policy first
DROP POLICY "Users can view their own or group transactions" ON public.transactions;

-- Create a new policy that allows viewing own transactions OR group transactions
CREATE POLICY "Users can view their own or group transactions"
ON public.transactions
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  (group_id IS NOT NULL AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  ))
);

-- 5. Create a function to get all members of a group
CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url
  FROM
    public.group_members gm
  JOIN
    public.profiles p ON gm.user_id = p.id
  WHERE
    gm.group_id = p_group_id;
$$;
