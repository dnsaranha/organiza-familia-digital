-- First, let's add the missing transactions table with proper relationships
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own or group transactions" 
ON public.transactions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (group_id IS NOT NULL AND is_group_member(group_id))
);

CREATE POLICY "Users can insert their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  (group_id IS NULL OR is_group_member(group_id))
);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Now let's add the Stripe subscription tables
CREATE TABLE IF NOT EXISTS public.stripe_user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT UNIQUE,
  customer_id TEXT,
  price_id TEXT,
  subscription_status TEXT,
  current_period_start BIGINT,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for stripe subscriptions
ALTER TABLE public.stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for stripe subscriptions
CREATE POLICY "Users can view their own subscription data" 
ON public.stripe_user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription data" 
ON public.stripe_user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription data" 
ON public.stripe_user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix the get_user_groups function to work properly
CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID,
  join_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fg.id,
    fg.name,
    fg.owner_id,
    fg.join_code,
    fg.created_at,
    fg.updated_at
  FROM public.family_groups fg
  LEFT JOIN public.group_members gm ON fg.id = gm.group_id
  WHERE fg.owner_id = auth.uid() OR gm.user_id = auth.uid()
  GROUP BY fg.id, fg.name, fg.owner_id, fg.join_code, fg.created_at, fg.updated_at;
$$;