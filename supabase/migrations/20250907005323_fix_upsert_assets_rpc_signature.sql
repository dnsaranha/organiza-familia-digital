-- 1. Drop the old function with the incorrect signature
DROP FUNCTION IF EXISTS public.upsert_financial_assets(public.financial_asset_type[]);
DROP TYPE IF EXISTS public.financial_asset_type;


-- 2. Create the RPC function with the correct signature (accepting JSONB)
CREATE OR REPLACE FUNCTION public.bulk_upsert_assets(assets_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    asset_record jsonb;
BEGIN
    -- Loop through each JSON object in the input array
    FOR asset_record IN SELECT * FROM jsonb_array_elements(assets_data)
    LOOP
        INSERT INTO public.financial_assets (
            ticker,
            name,
            sector,
            current_price,
            dividends_12m
        )
        VALUES (
            asset_record->>'ticker',
            asset_record->>'name',
            asset_record->>'sector',
            (asset_record->>'current_price')::numeric,
            (asset_record->>'dividends_12m')::numeric
        )
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


-- 3. Grant execute permission on the new function to the 'anon' and 'authenticated' roles
GRANT EXECUTE ON FUNCTION public.bulk_upsert_assets(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_assets(jsonb) TO authenticated;
