import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface YFinanceRequest {
  tickers: string[];
}

interface DividendEvent {
  date: string;
  amount: number;
}

interface HistoricalPrice {
  date: string;
  close: number;
}

interface AssetData {
  ticker: string;
  nome: string;
  setor: string;
  preco_atual: number;
  dividendos_12m: number;
  historico_dividendos: DividendEvent[];
  historico_precos: HistoricalPrice[];
}

// Função para buscar dados de um ticker específico
async function fetchTickerData(ticker: string): Promise<AssetData> {
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
    throw new Error(
      `Erro HTTP ${quoteResponse.status} ao buscar cotação para ${ticker}`,
    );
  }

  const quoteData = await quoteResponse.json();
  const quote = quoteData.quoteResponse?.result?.[0];

  if (!quote) {
    throw new Error(`Dados de cotação não encontrados para ${ticker}`);
  }

  // Buscar histórico (últimos 12 meses)
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);

  // 1. Buscar Dividendos
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
  const historico_dividendos: DividendEvent[] = [];

  if (dividendsResponse.ok) {
    const dividendsText = await dividendsResponse.text();
    const lines = dividendsText.split("\n");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(",");
        if (columns.length >= 2) {
          const date = columns[0];
          const dividendValue = parseFloat(columns[1]);
          if (!isNaN(dividendValue)) {
            dividendos12m += dividendValue;
            historico_dividendos.push({ date, amount: dividendValue });
          }
        }
      }
    }
  }

  // 2. Buscar Preços Históricos (Mensal)
  const historyResponse = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${oneYearAgo}&period2=${now}&interval=1mo&events=history&includeAdjustedClose=true`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    },
  );

  const historico_precos: HistoricalPrice[] = [];

  if (historyResponse.ok) {
    const historyText = await historyResponse.text();
    const lines = historyText.split("\n");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(",");
        if (columns.length >= 6) {
          const date = columns[0];
          const closeValue = parseFloat(columns[4]);
          if (!isNaN(closeValue)) {
            historico_precos.push({ date, close: closeValue });
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
    historico_dividendos,
    historico_precos,
  };
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

    const promises = tickers.map((ticker) => fetchTickerData(ticker));
    const results = await Promise.allSettled(promises);

    const assets: AssetData[] = [];
    const errors: { ticker: string; reason: string }[] = [];

    results.forEach((result, index) => {
      const ticker = tickers[index];
      if (result.status === "fulfilled") {
        assets.push(result.value);
      } else {
        console.error(`Erro ao processar ${ticker}:`, result.reason);
        errors.push({
          ticker: ticker,
          reason:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    });

    return new Response(JSON.stringify({ assets, errors }), {
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
