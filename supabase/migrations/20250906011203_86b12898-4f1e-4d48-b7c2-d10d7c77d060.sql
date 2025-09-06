-- PHASE 1: Fix Critical Data Exposure Issues

-- 1. Remove dangerous profile policy that exposes all user data
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Create secure profile policy - users can only see their own profile and group members' profiles
CREATE POLICY "Users can view own profile and group members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR
  id IN (
    SELECT gm.user_id 
    FROM public.group_members gm
    WHERE gm.group_id IN (
      SELECT gm2.group_id 
      FROM public.group_members gm2 
      WHERE gm2.user_id = auth.uid()
    )
  )
);

-- 3. Enable RLS on payment tables and add secure policies
ALTER TABLE public.stripe_user_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add policy for stripe_user_orders - users can only see their own orders
CREATE POLICY "Users can view their own orders only"
ON public.stripe_user_orders
FOR SELECT
USING (
  customer_id IN (
    SELECT sc.customer_id
    FROM public.stripe_customers sc
    WHERE sc.user_id = auth.uid() AND sc.deleted_at IS NULL
  )
);

-- Add policy for stripe_user_subscriptions - users can only see their own subscriptions
CREATE POLICY "Users can view their own subscriptions only"
ON public.stripe_user_subscriptions
FOR SELECT
USING (
  customer_id IN (
    SELECT sc.customer_id
    FROM public.stripe_customers sc
    WHERE sc.user_id = auth.uid() AND sc.deleted_at IS NULL
  )
);

-- PHASE 2: Database Security Hardening

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS TABLE(id uuid, name text, owner_id uuid, join_code text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fg.id,
    fg.name,
    fg.owner_id,
    fg.join_code,
    fg.created_at,
    fg.updated_at
  FROM public.family_groups fg
  WHERE fg.id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    gm.role
  FROM
    public.group_members gm
  JOIN
    public.profiles p ON gm.user_id = p.id
  WHERE
    gm.group_id = p_group_id;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Clean up duplicate RLS policies on transactions table
DROP POLICY IF EXISTS "Users can view their own or group transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;