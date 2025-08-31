-- This migration adds Row Level Security (RLS) policies to the 'transactions' table.
-- These policies are essential for securing user data and enabling the edit/delete functionality.

-- Enable Row Level Security on the transactions table
-- This is a prerequisite for the policies below to take effect.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy
-- Allows users to view:
--   a) Their own personal transactions (where group_id is null).
--   b) All transactions belonging to any group they are a member of.
CREATE POLICY "Allow users to view their own and group transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) OR
  (group_id IS NOT NULL AND group_id IN (
    SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
  ))
);

-- 2. INSERT Policy
-- Allows users to insert a transaction if:
--   a) They are the owner of the transaction (user_id matches their own).
--   b) If a group_id is specified, they must be a member of that group.
CREATE POLICY "Allow users to insert transactions for self or group"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND
  (group_id IS NULL OR group_id IN (
    SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
  ))
);

-- 3. UPDATE Policy
-- Allows a user to update a transaction only if they are the original creator (user_id matches).
-- This applies to both personal and group transactions.
CREATE POLICY "Allow users to update their own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. DELETE Policy
-- Allows a user to delete a transaction only if they are the original creator (user_id matches).
-- This applies to both personal and group transactions.
CREATE POLICY "Allow users to delete their own transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
