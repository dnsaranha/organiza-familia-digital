import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type ManualInvestmentTransaction = Tables<"investment_transactions">;

interface AssetPosition {
  ticker: string;
  name: string;
  category: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  totalFees: number;
  currentPrice?: number;
  marketValue?: number;
  profitLoss?: number;
  profitability?: number;
  accumulatedDividends?: number;
  yieldOnCost?: number;
}

export function useManualInvestments() {
  const [transactions, setTransactions] = useState<ManualInvestmentTransaction[]>([]);
  const [positions, setPositions] = useState<AssetPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [pricesCache, setPricesCache] = useState<Map<string, { price: number; timestamp: number }>>(new Map());
  const [dividendsCache, setDividendsCache] = useState<Map<string, { total: number; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      await calculatePositions(data || []);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromFinancialAssets = async (tickers: string[]): Promise<{ prices: Map<string, number>, dividends: Map<string, number> }> => {
    const prices = new Map<string, number>();
    const dividends = new Map<string, number>();

    if (tickers.length === 0) return { prices, dividends };

    const { data, error } = await supabase
      .from("financial_assets")
      .select("ticker, current_price, dividends_12m")
      .in("ticker", tickers.map(t => `${t}.SA`));

    if (error) {
      console.error("Erro ao buscar da tabela financial_assets:", error);
      return { prices, dividends };
    }

    data?.forEach(asset => {
      const ticker = asset.ticker.replace('.SA', '');
      if (asset.current_price !== null) {
        prices.set(ticker, asset.current_price);
      }
      if (asset.dividends_12m !== null) {
        dividends.set(ticker, asset.dividends_12m);
      }
    });

    return { prices, dividends };
  };

  const fetchRealTimeData = async (tickers: string[]) => {
    if (tickers.length === 0) return { prices: new Map(), dividends: new Map() };

    const now = Date.now();
    const tickersToFetch: string[] = [];
    const prices = new Map(pricesCache);
    const dividends = new Map(dividendsCache);

    // Check cache
    tickers.forEach(ticker => {
      const priceCache = pricesCache.get(ticker);
      const divCache = dividendsCache.get(ticker);
      
      if (!priceCache || (now - priceCache.timestamp) > CACHE_DURATION) {
        tickersToFetch.push(ticker);
      }
      if (!divCache || (now - divCache.timestamp) > CACHE_DURATION) {
        if (!tickersToFetch.includes(ticker)) {
          tickersToFetch.push(ticker);
        }
      }
    });

    if (tickersToFetch.length === 0) {
      return { prices, dividends };
    }

    try {
      // Fetch prices from B3
      const symbols = tickersToFetch.map(t => t.includes('.SA') ? t : `${t}.SA`);
      const { data: quotesData, error: quotesError } = await supabase.functions.invoke("b3-quotes", {
        body: { symbols },
      });

      if (!quotesError && quotesData?.quotes) {
        quotesData.quotes.forEach((quote: any) => {
          const ticker = quote.symbol.replace('.SA', '');
          prices.set(ticker, {
            price: quote.regularMarketPrice || 0,
            timestamp: now,
          });
        });
      }

      // Fetch dividends from Yahoo Finance
      const { data: dividendsData, error: dividendsError } = await supabase.functions.invoke("get-dividends", {
        body: { tickers: symbols, months: 12 },
      });

      if (!dividendsError && dividendsData?.dividends) {
        dividendsData.dividends.forEach((div: any) => {
          const ticker = div.ticker.replace('.SA', '');
          dividends.set(ticker, {
            total: div.totalDividends || 0,
            timestamp: now,
          });
        });
      }

      setPricesCache(prices);
      setDividendsCache(dividends);
    } catch (error) {
      console.error("Erro ao buscar dados em tempo real:", error);
    }

    return { prices, dividends };
  };

  const calculatePositions = async (txs: ManualInvestmentTransaction[]) => {
    const positionMap = new Map<string, AssetPosition>();

    txs.forEach((tx) => {
      const existing = positionMap.get(tx.ticker);
      const txFees = tx.fees || 0;

      if (tx.transaction_type === "buy") {
        if (existing) {
          const newQuantity = existing.quantity + tx.quantity;
          const newCost = existing.totalCost + tx.quantity * tx.price + txFees;
          positionMap.set(tx.ticker, {
            ...existing,
            quantity: newQuantity,
            totalCost: newCost,
            totalFees: existing.totalFees + txFees,
            averagePrice: newCost / newQuantity,
          });
        } else {
          const cost = tx.quantity * tx.price + txFees;
          positionMap.set(tx.ticker, {
            ticker: tx.ticker,
            name: tx.asset_name,
            category: (tx as any).category || "ACAO",
            quantity: tx.quantity,
            averagePrice: cost / tx.quantity,
            totalCost: cost,
            totalFees: txFees,
          });
        }
      } else if (tx.transaction_type === "sell" && existing) {
        const newQuantity = existing.quantity - tx.quantity;
        const proportionSold = tx.quantity / existing.quantity;
        const costReduction = existing.totalCost * proportionSold;

        if (newQuantity > 0) {
          positionMap.set(tx.ticker, {
            ...existing,
            quantity: newQuantity,
            totalCost: existing.totalCost - costReduction,
            averagePrice:
              (existing.totalCost - costReduction) / newQuantity,
          });
        } else {
          positionMap.delete(tx.ticker);
        }
      }
    });

    const tickers = Array.from(positionMap.keys());

    // 1. Tentar buscar dados em tempo real
    const { prices: realTimePrices, dividends: realTimeDividends } = await fetchRealTimeData(tickers);

    // 2. Para tickers sem dados, buscar na tabela de fallback
    const tickersWithoutData = tickers.filter(t => !realTimePrices.has(t) || !realTimeDividends.has(t));
    const { prices: fallbackPrices, dividends: fallbackDividends } = await fetchFromFinancialAssets(tickersWithoutData);

    // 3. Juntar os dados
    const finalPrices = new Map(fallbackPrices);
    realTimePrices.forEach((value, key) => finalPrices.set(key, value.price)); // Sobrescreve com dados em tempo real

    const finalDividends = new Map(fallbackDividends);
    realTimeDividends.forEach((value, key) => finalDividends.set(key, value.total));

    // Enhance positions
    const enhancedPositions = Array.from(positionMap.values()).map(
      (position) => {
        const currentPrice = finalPrices.get(position.ticker) || position.averagePrice;
        const accumulatedDividends = finalDividends.get(position.ticker) || 0;

        const marketValue = currentPrice * position.quantity;
        const profitLoss = marketValue - position.totalCost;
        const profitability =
          position.totalCost > 0
            ? (profitLoss / position.totalCost) * 100
            : 0;
        const yieldOnCost =
          position.totalCost > 0 && accumulatedDividends > 0
            ? (accumulatedDividends / position.totalCost) * 100
            : 0;

        return {
          ...position,
          currentPrice,
          marketValue,
          profitLoss,
          profitability,
          accumulatedDividends: accumulatedDividends * position.quantity, // Multiplica pelo número de ativos
          yieldOnCost,
        };
      },
    );

    setPositions(enhancedPositions);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    positions,
    loading,
    refresh: fetchTransactions,
  };
}
