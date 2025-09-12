-- 1. Create the financial_assets table
CREATE TABLE IF NOT EXISTS public.financial_assets (
  ticker TEXT NOT NULL PRIMARY KEY,
  name TEXT,
  sector TEXT,
  current_price NUMERIC(10, 2),
  dividends_12m NUMERIC(10, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Set up Row Level Security (RLS)
ALTER TABLE public.financial_assets ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies
-- For this table, the data is public market data, so it's safe for any authenticated user to read.
-- For writing, we assume this script will be run in a trusted server environment.
-- A service_role key would bypass RLS, but if using a standard anon key, we need policies.

DROP POLICY IF EXISTS "Allow all users to read financial assets" ON public.financial_assets;
CREATE POLICY "Allow all users to read financial assets"
  ON public.financial_assets
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public anonymous access to financial assets" ON public.financial_assets;
CREATE POLICY "Allow public anonymous access to financial assets"
  ON public.financial_assets
  FOR ALL -- Includes INSERT, UPDATE, DELETE
  TO public -- Grant access to anon and authenticated roles
  USING (true)
  WITH CHECK (true);

-- 4. Add a function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_asset_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a trigger to call the function on update
DROP TRIGGER IF EXISTS on_asset_update ON public.financial_assets;
CREATE TRIGGER on_asset_update
  BEFORE UPDATE ON public.financial_assets
  FOR EACH ROW EXECUTE PROCEDURE public.handle_asset_update();
