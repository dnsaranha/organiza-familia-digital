-- 1. Create a custom type to match the structure of a single asset
-- This improves type safety and makes the function definition cleaner.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_asset_type') THEN
        CREATE TYPE public.financial_asset_type AS (
            ticker TEXT,
            name TEXT,
            sector TEXT,
            current_price NUMERIC,
            dividends_12m NUMERIC
        );
    END IF;
END
$$;


-- 2. Create the RPC function to handle the upsert logic
CREATE OR REPLACE FUNCTION public.upsert_financial_assets(assets public.financial_asset_type[])
RETURNS void
LANGUAGE plpgsql
-- SECURITY DEFINER runs the function with the permissions of the user who created it (postgres),
-- bypassing the RLS policies of the calling user (anon).
SECURITY DEFINER
AS $$
DECLARE
    asset public.financial_asset_type;
BEGIN
    FOREACH asset IN ARRAY assets
    LOOP
        INSERT INTO public.financial_assets (ticker, name, sector, current_price, dividends_12m)
        VALUES (asset.ticker, asset.name, asset.sector, asset.current_price, asset.dividends_12m)
        ON CONFLICT (ticker) DO UPDATE
        SET
            name = EXCLUDED.name,
            sector = EXCLUDED.sector,
            current_price = EXCLUDED.current_price,
            dividends_12m = EXCLUDED.dividends_12m,
            updated_at = NOW();
    END LOOP;
END;
$$;


-- 3. Grant execute permission on the function to the 'anon' and 'authenticated' roles
-- This allows clients using the public API key to call this specific function.
GRANT EXECUTE ON FUNCTION public.upsert_financial_assets(public.financial_asset_type[]) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_financial_assets(public.financial_asset_type[]) TO authenticated;
