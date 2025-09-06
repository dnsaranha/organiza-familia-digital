-- PHASE 1: Complete profile security fix only

-- Remove dangerous profile policy that exposes all user data
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure profile policy - users can only see their own profile and group members' profiles
CREATE POLICY "Users can view own profile and group members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR
  id IN (
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id IN (
      SELECT gm2.group_id 
      FROM public.group_members gm2 
      WHERE gm2.user_id = auth.uid()
    )
  )
);

-- PHASE 2: Clean up duplicate RLS policies on transactions table
DROP POLICY IF EXISTS "Users can view their own or group transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;