-- Remove the old, incorrect foreign key constraints and add new ones with ON DELETE CASCADE

-- For group_members
ALTER TABLE public.group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;

ALTER TABLE public.group_members
ADD CONSTRAINT group_members_group_id_fkey
FOREIGN KEY (group_id) REFERENCES public.family_groups(id) ON DELETE CASCADE;

-- For transactions
-- There are two constraints on this table pointing to family_groups, which is likely a mistake. Let's remove both.
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_group_id_fkey,
DROP CONSTRAINT IF EXISTS group_id; -- This is the name of the second constraint from the schema dump

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_group_id_fkey
FOREIGN KEY (group_id) REFERENCES public.family_groups(id) ON DELETE CASCADE;

-- For scheduled_tasks
ALTER TABLE public.scheduled_tasks
DROP CONSTRAINT IF EXISTS scheduled_tasks_group_id_fkey;

ALTER TABLE public.scheduled_tasks
ADD CONSTRAINT scheduled_tasks_group_id_fkey
FOREIGN KEY (group_id) REFERENCES public.family_groups(id) ON DELETE CASCADE;

-- Drop the now-unnecessary RPC function
DROP FUNCTION IF EXISTS public.delete_group_and_transactions(p_group_id uuid);
