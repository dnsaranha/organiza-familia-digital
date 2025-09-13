CREATE TABLE push_subscriptions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, subscription ->> 'endpoint')
);

COMMENT ON TABLE public.push_subscriptions IS 'Stores user subscriptions for web push notifications.';
COMMENT ON COLUMN public.push_subscriptions.user_id IS 'The user associated with this subscription.';
COMMENT ON COLUMN public.push_subscriptions.subscription IS 'The PushSubscription object from the browser.';

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Allow users to view their own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);
