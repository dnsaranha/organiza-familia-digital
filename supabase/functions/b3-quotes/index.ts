import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotesRequest {
  symbols: string[];
}

// Mapeamento de símbolos para Yahoo Finance
const mapSymbolToYahoo = (symbol: string): string => {
  // Criptomoedas (não precisam de sufixo)
  if (['BTC', 'ETH'].includes(symbol)) {
    return `${symbol}-USD`;
  }

  // Para a maioria dos ativos da B3 (ações, FIIs, BDRs, ETFs),
  // o formato é 4 letras seguidas de 1 ou 2 números.
  // Exemplos: PETR4, MGLU3, KNRI11, BOVA11, AAPL34.
  // Todos eles usam o sufixo ".SA" no Yahoo Finance.
  if (symbol.match(/^[A-Z]{4}[0-9]{1,2}$/)) {
    return `${symbol}.SA`;
  }

  // Se o símbolo não corresponder a nenhum padrão conhecido,
  // retorna o símbolo como está (pode ser um ativo internacional).
  return symbol;
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { symbols }: QuotesRequest = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Símbolos inválidos ou não fornecidos');
    }

    const yahooSymbols = symbols.map(mapSymbolToYahoo);

    const CHUNK_SIZE = 100;
    const symbolChunks: string[][] = [];
    for (let i = 0; i < yahooSymbols.length; i += CHUNK_SIZE) {
      symbolChunks.push(yahooSymbols.slice(i, i + CHUNK_SIZE));
    }

    const allQuotes: any[] = [];

    await Promise.all(
      symbolChunks.map(async (chunk) => {
        const symbolsParam = chunk.join(',');
        const yahooResponse = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          }
        );

        if (!yahooResponse.ok) {
          const errorBody = await yahooResponse.text();
          console.error(
            `Falha ao buscar cotações do Yahoo Finance. Status: ${yahooResponse.status}`,
            { symbols: chunk, response: errorBody }
          );
          return;
        }

        const yahooData = await yahooResponse.json();

        if (yahooData.quoteResponse && yahooData.quoteResponse.result) {
          const validQuotes = yahooData.quoteResponse.result.filter(
            (quote: any) => quote && typeof quote.regularMarketPrice === 'number'
          );
          allQuotes.push(...validQuotes);
        }
      })
    );

    const quotes = allQuotes.map((quote: any) => ({
      symbol: quote.symbol.replace('.SA', ''),
      shortName: quote.shortName || quote.symbol.replace('.SA', ''),
      longName: quote.longName || quote.shortName || quote.symbol.replace('.SA', ''),
      currency: quote.currency || 'BRL',
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange || 0,
      regularMarketChangePercent: quote.regularMarketChangePercent || 0,
      regularMarketTime: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      marketCap: quote.marketCap || 0,
      volume: quote.regularMarketVolume || 0,
      averageDailyVolume3Month: quote.averageDailyVolume3Month || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      dividendYield: quote.dividendYield || null,
      trailingPE: quote.trailingPE || null,
      forwardPE: quote.forwardPE || null,
    }));

    return new Response(
      JSON.stringify({ quotes }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro na função b3-quotes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});