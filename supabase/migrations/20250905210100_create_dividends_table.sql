CREATE TABLE public.dividends (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    symbol text NOT NULL,
    amount numeric NOT NULL,
    payment_date date,
    ex_date date,
    CONSTRAINT dividends_pkey PRIMARY KEY (id),
    CONSTRAINT dividends_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own dividends"
ON public.dividends
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_dividends_user_id ON public.dividends USING btree (user_id);
