-- Add the pluggy_item_id column to the stripe_customers table
ALTER TABLE public.stripe_customers
ADD COLUMN pluggy_item_id TEXT;

-- Add a policy to allow users to update their own pluggy_item_id
CREATE POLICY "Users can update their own pluggy_item_id"
    ON public.stripe_customers
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
