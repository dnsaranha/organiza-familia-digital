CREATE TABLE public.investment_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    symbol text NOT NULL,
    quantity numeric NOT NULL,
    price numeric NOT NULL,
    "type" text NOT NULL,
    cost numeric,
    date date NOT NULL,
    asset_type text,
    CONSTRAINT investment_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT investment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own investment transactions"
ON public.investment_transactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_investment_transactions_user_id ON public.investment_transactions USING btree (user_id);
