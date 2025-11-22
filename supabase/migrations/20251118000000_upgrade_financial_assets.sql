-- 1. Add history columns to financial_assets table
ALTER TABLE public.financial_assets
ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dividend_history JSONB DEFAULT '[]'::jsonb;

-- 2. Create a function to get unique tickers from investment transactions (and existing assets)
-- This allows the python script (running as anon) to know what tickers to fetch
CREATE OR REPLACE FUNCTION public.get_unique_tickers()
RETURNS TABLE (ticker text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ticker
  FROM public.investment_transactions
  WHERE ticker IS NOT NULL
  UNION
  SELECT ticker FROM public.financial_assets
$$;

GRANT EXECUTE ON FUNCTION public.get_unique_tickers() TO anon;
GRANT EXECUTE ON FUNCTION public.get_unique_tickers() TO authenticated;

-- 3. Update the bulk_upsert_assets function to handle the new columns
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
            dividends_12m,
            price_history,
            dividend_history
        )
        VALUES (
            asset_record->>'ticker',
            asset_record->>'name',
            asset_record->>'sector',
            (asset_record->>'current_price')::numeric,
            (asset_record->>'dividends_12m')::numeric,
            COALESCE(asset_record->'price_history', '[]'::jsonb),
            COALESCE(asset_record->'dividend_history', '[]'::jsonb)
        )
        ON CONFLICT (ticker) DO UPDATE
        SET
            name = EXCLUDED.name,
            sector = EXCLUDED.sector,
            current_price = EXCLUDED.current_price,
            dividends_12m = EXCLUDED.dividends_12m,
            price_history = EXCLUDED.price_history,
            dividend_history = EXCLUDED.dividend_history,
            updated_at = NOW();
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_upsert_assets(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_assets(jsonb) TO authenticated;
