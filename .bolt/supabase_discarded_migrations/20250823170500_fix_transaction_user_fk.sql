-- Drop the existing foreign key constraint that points to auth.users
-- Note: This might fail if the constraint name is different.
-- The default name is <table_name>_<column_name>_fkey
ALTER TABLE public.transactions
DROP CONSTRAINT transactions_user_id_fkey;

-- Add a new foreign key constraint pointing to public.profiles
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
