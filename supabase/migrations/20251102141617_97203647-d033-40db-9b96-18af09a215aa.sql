-- Create investment_transactions table for manual buy/sell entries
CREATE TABLE public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price > 0),
  transaction_date DATE NOT NULL,
  fees NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_investment_transactions_user_id ON public.investment_transactions(user_id);
CREATE INDEX idx_investment_transactions_group_id ON public.investment_transactions(group_id);
CREATE INDEX idx_investment_transactions_ticker ON public.investment_transactions(ticker);
CREATE INDEX idx_investment_transactions_date ON public.investment_transactions(transaction_date);

-- Enable Row Level Security
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_investment_transactions_updated_at
BEFORE UPDATE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can view their own or group investment transactions"
ON public.investment_transactions
FOR SELECT
USING (
  auth.uid() = user_id OR
  (group_id IS NOT NULL AND is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can insert their own investment transactions"
ON public.investment_transactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (group_id IS NULL OR is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can update their own investment transactions"
ON public.investment_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment transactions"
ON public.investment_transactions
FOR DELETE
USING (auth.uid() = user_id);