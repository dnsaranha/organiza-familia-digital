import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface YFinanceRequest {
  tickers: string[];
}

interface AssetData {
  ticker: string;
  nome: string;
  setor: string;
  preco_atual: number;
  dividendos_12m: number;
}

// Função para buscar dados de um ticker específico
async function fetchTickerData(ticker: string): Promise<AssetData | null> {
  try {
    // Buscar informações básicas do ativo
    const quoteResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
        },
      },
    );

    if (!quoteResponse.ok) {
      throw new Error(`Erro ao buscar cotação para ${ticker}`);
    }

    const quoteData = await quoteResponse.json();
    const quote = quoteData.quoteResponse?.result?.[0];

    if (!quote) {
      throw new Error(`Dados não encontrados para ${ticker}`);
    }

    // Buscar histórico de dividendos (últimos 12 meses)
    const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);

    const dividendsResponse = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${oneYearAgo}&period2=${now}&interval=1d&events=div&includeAdjustedClose=true`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      },
    );

    let dividendos12m = 0;
    if (dividendsResponse.ok) {
      const dividendsText = await dividendsResponse.text();
      const lines = dividendsText.split("\n");

      // Processar CSV de dividendos
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const columns = line.split(",");
          if (columns.length >= 2) {
            const dividendValue = parseFloat(columns[1]);
            if (!isNaN(dividendValue)) {
              dividendos12m += dividendValue;
            }
          }
        }
      }
    }

    return {
      ticker: ticker,
      nome: quote.shortName || quote.longName || ticker,
      setor: quote.sector || "N/A",
      preco_atual: quote.regularMarketPrice || 0,
      dividendos_12m: dividendos12m,
    };
  } catch (error) {
    console.error(`Erro ao processar ${ticker}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { tickers }: YFinanceRequest = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      throw new Error("Lista de tickers inválida ou vazia");
    }

    // Processar todos os tickers em paralelo
    const promises = tickers.map((ticker) => fetchTickerData(ticker));
    const results = await Promise.all(promises);

    // Filtrar resultados válidos
    const validResults = results.filter(
      (result): result is AssetData => result !== null,
    );

    return new Response(JSON.stringify({ assets: validResults }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro na função yfinance-data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
