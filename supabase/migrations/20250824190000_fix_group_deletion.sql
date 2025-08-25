-- Step 1: Drop the existing foreign key constraint on transactions.group_id
-- First, we need to find the name of the constraint.
-- This can be found in the information_schema.
-- For this example, let's assume the constraint is named "transactions_group_id_fkey".
-- You may need to adjust this name based on your actual database schema.
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_group_id_fkey,
ADD CONSTRAINT transactions_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.family_groups(id)
  ON DELETE CASCADE;

-- Step 2: Create a new RPC function to delete a group and its transactions
CREATE OR REPLACE FUNCTION delete_group_and_transactions(p_group_id UUID)
RETURNS void AS $$
BEGIN
  -- First, delete all transactions associated with the group
  DELETE FROM public.transactions WHERE group_id = p_group_id;

  -- Then, delete the group itself
  DELETE FROM public.family_groups WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql;
