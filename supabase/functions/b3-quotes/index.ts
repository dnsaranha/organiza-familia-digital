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
  // Ações brasileiras
  if (symbol.match(/^[A-Z]{4}[0-9]{1,2}$/)) {
    return `${symbol}.SA`;
  }
  
  // FIIs brasileiros
  if (symbol.match(/^[A-Z]{4}11$/)) {
    return `${symbol}.SA`;
  }
  
  // Criptomoedas
  if (symbol === 'BTC') return 'BTC-USD';
  if (symbol === 'ETH') return 'ETH-USD';
  
  // ETFs brasileiros
  if (symbol.startsWith('BOVA') || symbol.startsWith('SMAL') || symbol.startsWith('IVVB')) {
    return `${symbol}.SA`;
  }
  
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

    // Mapear símbolos para formato Yahoo Finance
    const yahooSymbols = symbols.map(mapSymbolToYahoo);
    const symbolsParam = yahooSymbols.join(',');

    // Buscar cotações via Yahoo Finance
    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!yahooResponse.ok) {
      throw new Error('Falha ao buscar cotações do Yahoo Finance');
    }

    const yahooData = await yahooResponse.json();

    if (!yahooData.quoteResponse || !yahooData.quoteResponse.result) {
      // Se a resposta principal falhar, ainda pode ser um erro de um símbolo específico
      console.warn('Resposta do Yahoo Finance não contém quoteResponse.result. Verifique os símbolos:', symbols);
      // Retorna uma lista vazia para não quebrar o front-end
      return new Response(JSON.stringify({ quotes: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar e formatar dados, filtrando resultados nulos ou sem preço
    const quotes = yahooData.quoteResponse.result
      .map((quote: any) => {
        if (!quote || typeof quote.regularMarketPrice !== 'number') {
          return null; // Ignorar resultados inválidos
        }

        return {
          symbol: quote.symbol.replace('.SA', ''), // Mapear de volta para o símbolo original
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
        };
      })
      .filter((quote: any): quote is any => quote !== null);

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