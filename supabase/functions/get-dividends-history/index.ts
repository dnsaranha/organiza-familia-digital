import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const mapSymbolToYahoo = (symbol: string): string => {
  if (symbol.match(/^[A-Z]{4}[0-9]{1,2}$/)) {
    return `${symbol}.SA`;
  }
  if (symbol.match(/^[A-Z]{4}11$/)) {
    return `${symbol}.SA`;
  }
  return symbol;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symbol, from, to } = await req.json()

    if (!symbol || !from || !to) {
      return new Response(JSON.stringify({ error: 'Missing required fields: symbol, from, to' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const yahooSymbol = mapSymbolToYahoo(symbol);
    const period1 = Math.floor(new Date(from).getTime() / 1000);
    const period2 = Math.floor(new Date(to).getTime() / 1000);

    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d&events=div`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!yahooResponse.ok) {
        const errorText = await yahooResponse.text();
        console.error(`Yahoo Finance API error for ${yahooSymbol}:`, errorText);
        throw new Error(`Failed to fetch dividend data from Yahoo Finance: ${yahooResponse.statusText}`);
    }

    const yahooData = await yahooResponse.json();
    const result = yahooData.chart.result[0];

    if (!result || !result.events || !result.events.dividends) {
        return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const dividends = Object.values(result.events.dividends).map((div: any) => ({
      amount: div.amount,
      date: new Date(div.date * 1000).toISOString(),
    }));

    return new Response(JSON.stringify(dividends), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-dividends-history:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
