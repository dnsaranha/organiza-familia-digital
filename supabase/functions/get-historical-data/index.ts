import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to map symbols for Yahoo Finance
const mapSymbolToYahoo = (symbol: string): string => {
  if (symbol.match(/^[A-Z]{4}[0-9]{1,2}$/)) {
    return `${symbol}.SA`;
  }
  if (symbol.match(/^[A-Z]{4}11$/)) {
    return `${symbol}.SA`;
  }
  if (symbol === 'BTC') return 'BTC-USD';
  if (symbol === 'ETH') return 'ETH-USD';
  if (symbol.startsWith('BOVA') || symbol.startsWith('SMAL') || symbol.startsWith('IVVB')) {
    return `${symbol}.SA`;
  }
  // CDI is a special case. It's an index, not a traded asset.
  // I will need a different way to fetch this data, probably from the Brazilian Central Bank API.
  // For now, this function will not handle 'CDI'. I will create a separate function for it.
  return symbol;
};


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symbol, from, to, interval = '1d' } = await req.json()

    if (!symbol || !from || !to) {
      return new Response(JSON.stringify({ error: 'Missing required fields: symbol, from, to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (symbol === 'CDI') {
        // Placeholder for CDI data fetching logic
        // This will be implemented in a separate function.
        return new Response(JSON.stringify({ error: 'CDI fetching not implemented in this function' }), {
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const yahooSymbol = mapSymbolToYahoo(symbol);
    const period1 = Math.floor(new Date(from).getTime() / 1000);
    const period2 = Math.floor(new Date(to).getTime() / 1000);

    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!yahooResponse.ok) {
        const errorText = await yahooResponse.text();
        console.error(`Yahoo Finance API error for ${yahooSymbol}:`, errorText);
        throw new Error(`Failed to fetch historical data from Yahoo Finance: ${yahooResponse.statusText}`);
    }

    const yahooData = await yahooResponse.json();

    const chart = yahooData.chart.result[0];
    if (!chart || !chart.timestamp) {
        return new Response(JSON.stringify({ timestamps: [], prices: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const { timestamp, indicators } = chart;
    const prices = indicators.quote[0].close;

    // Filter out null values where the market was closed
    const validData = timestamp.map((t: number, i: number) => ({
        timestamp: t,
        price: prices[i]
    })).filter((d: any) => d.price !== null);


    const responseData = {
        timestamps: validData.map((d: any) => d.timestamp * 1000), // convert to ms for JS
        prices: validData.map((d: any) => d.price),
    };


    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-historical-data:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
