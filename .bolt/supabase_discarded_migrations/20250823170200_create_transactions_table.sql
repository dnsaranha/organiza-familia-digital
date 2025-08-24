-- Create transaction_type ENUM for better type safety
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
    type public.transaction_type NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX ON public.transactions(user_id);
CREATE INDEX ON public.transactions(group_id);
CREATE INDEX ON public.transactions(date);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can view their own or group transactions"
ON public.transactions
FOR SELECT
USING (
    auth.uid() = user_id OR
    (group_id IS NOT NULL AND public.is_group_member(group_id))
);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    (group_id IS NULL OR public.is_group_member(group_id))
);

CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
USING (
    auth.uid() = user_id
);
