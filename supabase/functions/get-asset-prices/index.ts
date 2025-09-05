import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This is the unofficial Yahoo Finance API endpoint
const YFINANCE_API_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';

// Helper function to handle CORS preflight requests
const handleOptions = (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  const url = new URL(req.url);
  const symbols = url.searchParams.get('symbols');

  if (!symbols) {
    return new Response(
      JSON.stringify({ error: 'Missing "symbols" query parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  try {
    const response = await fetch(`${YFINANCE_API_URL}?symbols=${symbols}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Yahoo Finance API request failed with status ${response.status}: ${errorText}`);
      throw new Error(`Yahoo Finance API request failed.`);
    }
    const data = await response.json();

    if (!data.quoteResponse || !data.quoteResponse.result) {
      throw new Error('Invalid response structure from Yahoo Finance API');
    }

    const prices = data.quoteResponse.result.map((asset: any) => ({
      symbol: asset.symbol,
      price: asset.regularMarketPrice,
      currency: asset.currency,
    }));

    return new Response(
      JSON.stringify(prices),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
