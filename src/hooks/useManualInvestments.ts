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

    console.log("Fetching real-time data for tickers:", tickersToFetch);

    try {
      // Use yfinance-data function for comprehensive data
      const symbols = tickersToFetch.map(t => t.includes('.SA') ? t : `${t}.SA`);
      console.log("Calling yfinance-data with symbols:", symbols);
      
      const { data, error } = await supabase.functions.invoke("yfinance-data", {
        body: { tickers: symbols },
      });

      if (error) {
        console.error("Error fetching yfinance data:", error);
      } else if (data?.assets) {
        console.log("Received yfinance data:", data.assets);
        data.assets.forEach((asset: any) => {
          const ticker = asset.ticker.replace('.SA', '');
          const price = asset.preco_atual || 0;
          const dividends12m = asset.dividendos_12m || 0;
          
          console.log(`Setting data for ${ticker}: price=${price}, dividends=${dividends12m}`);
          
          prices.set(ticker, {
            price,
            timestamp: now,
          });
          
          dividends.set(ticker, {
            total: dividends12m,
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
          const newCost = existing.totalCost + (tx.quantity * tx.price) + txFees;
          positionMap.set(tx.ticker, {
            ...existing,
            quantity: newQuantity,
            totalCost: newCost,
            totalFees: existing.totalFees + txFees,
            averagePrice: newCost / newQuantity,
          });
        } else {
          const cost = (tx.quantity * tx.price) + txFees;
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
            averagePrice: (existing.totalCost - costReduction) / newQuantity,
          });
        } else {
          positionMap.delete(tx.ticker);
        }
      }
    });

    // Fetch real-time data for all positions
    const tickers = Array.from(positionMap.keys());
    const { prices, dividends } = await fetchRealTimeData(tickers);

    // Enhance positions with real-time data
    const enhancedPositions = Array.from(positionMap.values()).map(position => {
      const priceData = prices.get(position.ticker);
      const dividendData = dividends.get(position.ticker);
      
      console.log(`Processing position for ${position.ticker}:`, {
        priceData,
        dividendData,
        averagePrice: position.averagePrice,
        quantity: position.quantity,
        totalCost: position.totalCost
      });
      
      const currentPrice = priceData?.price || position.averagePrice;
      const marketValue = currentPrice * position.quantity;
      const profitLoss = marketValue - position.totalCost;
      const profitability = position.totalCost > 0 ? (profitLoss / position.totalCost) * 100 : 0;
      const accumulatedDividends = (dividendData?.total || 0) * position.quantity;
      const yieldOnCost = position.totalCost > 0 && accumulatedDividends > 0 
        ? (accumulatedDividends / position.totalCost) * 100 
        : 0;

      console.log(`Enhanced position for ${position.ticker}:`, {
        currentPrice,
        marketValue,
        profitLoss,
        profitability,
        accumulatedDividends,
        yieldOnCost
      });

      return {
        ...position,
        currentPrice,
        marketValue,
        profitLoss,
        profitability,
        accumulatedDividends,
        yieldOnCost,
      };
    });

    console.log("Final enhanced positions:", enhancedPositions);
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
