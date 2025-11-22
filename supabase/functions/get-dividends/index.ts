import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DividendRequest {
  tickers: string[];
  months?: number; // Number of months to look back (default 12)
}

interface DividendData {
  ticker: string;
  totalDividends: number;
  lastDividendDate?: string;
  lastDividendAmount?: number;
  dividendHistory: Array<{
    date: string;
    amount: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, months = 12 }: DividendRequest = await req.json();

    if (!tickers || tickers.length === 0) {
      throw new Error('Tickers array is required');
    }

    console.log(`Fetching dividend data for ${tickers.length} tickers`);

    const dividendPromises = tickers.map(ticker => fetchTickerDividends(ticker, months));
    const dividendResults = await Promise.all(dividendPromises);
    const validDividends = dividendResults.filter(d => d !== null);

    return new Response(
      JSON.stringify({ dividends: validDividends }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-dividends function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchTickerDividends(ticker: string, months: number): Promise<DividendData | null> {
  try {
    // Calculate date range
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = Math.floor((Date.now() - (months * 30 * 24 * 60 * 60 * 1000)) / 1000);

    // Yahoo Finance dividends endpoint
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d&events=div`;

    console.log(`Fetching dividends for ${ticker}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch dividends for ${ticker}: ${response.status}`);
      return {
        ticker,
        totalDividends: 0,
        dividendHistory: [],
      };
    }

    const data = await response.json();
    
    // Extract dividend data
    const chart = data?.chart?.result?.[0];
    const events = chart?.events?.dividends;

    if (!events) {
      console.log(`No dividend data found for ${ticker}`);
      return {
        ticker,
        totalDividends: 0,
        dividendHistory: [],
      };
    }

    // Process dividends
    const dividendHistory: Array<{ date: string; amount: number }> = [];
    let totalDividends = 0;
    let lastDividendDate: string | undefined;
    let lastDividendAmount: number | undefined;

    Object.values(events).forEach((div: any) => {
      const amount = div.amount || 0;
      const date = new Date(div.date * 1000).toISOString();
      
      dividendHistory.push({ date, amount });
      totalDividends += amount;
      
      if (!lastDividendDate || date > lastDividendDate) {
        lastDividendDate = date;
        lastDividendAmount = amount;
      }
    });

    // Sort by date descending
    dividendHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Found ${dividendHistory.length} dividends for ${ticker}, total: ${totalDividends}`);

    return {
      ticker,
      totalDividends,
      lastDividendDate,
      lastDividendAmount,
      dividendHistory,
    };
  } catch (error) {
    console.error(`Error fetching dividends for ${ticker}:`, error);
    return {
      ticker,
      totalDividends: 0,
      dividendHistory: [],
    };
  }
}
