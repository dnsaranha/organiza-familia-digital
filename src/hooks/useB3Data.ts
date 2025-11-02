import { useState, useEffect, useCallback } from "react";
import { b3Client } from "@/lib/b3/client";
import { B3Asset, B3Portfolio, B3Dividend } from "@/lib/open-banking/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useB3Data = () => {
  const [assets, setAssets] = useState<B3Asset[]>([]);
  const [portfolio, setPortfolio] = useState<B3Portfolio | null>(null);
  const [dividends, setDividends] = useState<B3Dividend[]>([]);
  const [portfolioEvolution, setPortfolioEvolution] = useState<any[]>([]);
  const [enhancedAssets, setEnhancedAssets] = useState<any[]>([]);
  const [dividendHistory, setDividendHistory] = useState<any[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<{
    value: number;
    change: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cache para cotações (5 minutos)
  const [quotesCache, setQuotesCache] = useState<
    Map<string, { data: B3Asset; timestamp: number }>
  >(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const getAssetQuotes = useCallback(
    async (symbols: string[], useCache = true) => {
      setLoading(true);
      try {
        const now = Date.now();
        const cachedQuotes: B3Asset[] = [];
        const symbolsToFetch: string[] = [];

        if (useCache) {
          symbols.forEach((symbol) => {
            const cached = quotesCache.get(symbol);
            if (cached && now - cached.timestamp < CACHE_DURATION) {
              cachedQuotes.push(cached.data);
            } else {
              symbolsToFetch.push(symbol);
            }
          });
        } else {
          symbolsToFetch.push(...symbols);
        }

        let freshQuotes: B3Asset[] = [];
        if (symbolsToFetch.length > 0) {
          // Use Supabase function to get real quotes
          const { data, error } = await supabase.functions.invoke("b3-quotes", {
            body: { symbols: symbolsToFetch },
          });

          if (error) {
            console.warn(
              "Erro ao buscar cotações via Supabase, usando fallback:",
              error,
            );
            freshQuotes = await b3Client.getAssetQuotes(symbolsToFetch);
          } else {
            freshQuotes = data.quotes || [];
          }

          // Atualizar cache
          const newCache = new Map(quotesCache);
          freshQuotes.forEach((quote) => {
            newCache.set(quote.symbol, { data: quote, timestamp: now });
          });
          setQuotesCache(newCache);
        }

        const allQuotes = [...cachedQuotes, ...freshQuotes];
        setAssets(allQuotes);
        return allQuotes;
      } catch (error) {
        console.error("Erro ao buscar cotações:", error);
        toast({
          title: "Erro ao Buscar Cotações",
          description: "Não foi possível buscar as cotações dos ativos.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [quotesCache, toast],
  );

  const getPortfolio = useCallback(
    async (brokerId: string, accessToken: string) => {
      setLoading(true);
      try {
        const portfolioData = await b3Client.getPortfolio(
          brokerId,
          accessToken,
        );
        setPortfolio(portfolioData);
        setConnected(true);
        return portfolioData;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Carteira",
          description:
            "Não foi possível carregar sua carteira de investimentos.",
          variant: "destructive",
        });
        setConnected(false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const getDividends = useCallback(
    async (
      brokerId: string,
      accessToken: string,
      fromDate?: string,
      toDate?: string,
    ) => {
      setLoading(true);
      try {
        const dividendsData = await b3Client.getDividends(
          brokerId,
          accessToken,
          fromDate,
          toDate,
        );
        setDividends(dividendsData);
        return dividendsData;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Dividendos",
          description: "Não foi possível carregar os dividendos recebidos.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const searchAssets = useCallback(
    async (query: string, assetType?: string) => {
      setLoading(true);
      try {
        const searchResults = await b3Client.searchAssets(query, assetType);
        return searchResults;
      } catch (error) {
        toast({
          title: "Erro na Busca",
          description: "Não foi possível buscar ativos.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const getAssetDetails = useCallback(
    async (symbol: string) => {
      setLoading(true);
      try {
        const assetDetails = await b3Client.getAssetDetails(symbol);
        return assetDetails;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Detalhes",
          description: "Não foi possível carregar detalhes do ativo.",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Buscar dados de evolução patrimonial
  const getPortfolioEvolutionData = useCallback(
    async (period: string = "12m") => {
      setLoading(true);
      try {
        const months = period === "12m" ? 12 : 6;
        let evolutionData: any[] = [];

        if (user) {
          // Get manual investments
          const { data: manualInvestments } = await supabase
            .from("manual_investments")
            .select("*")
            .eq("user_id", user.id)
            .order("transaction_date", { ascending: true });

          // Get Pluggy investments
          const { data: pluggyItems } = await supabase
            .from("pluggy_items")
            .select("item_id")
            .eq("user_id", user.id);

          let pluggyInvestments: any[] = [];
          if (pluggyItems && pluggyItems.length > 0) {
            const investmentPromises = pluggyItems.map((item) =>
              supabase.functions.invoke("pluggy-investments", {
                body: { itemId: item.item_id },
              }),
            );

            const investmentResults = await Promise.all(investmentPromises);
            pluggyInvestments = investmentResults.flatMap(
              (result) => result.data?.investments || [],
            );
          }

          // Calculate portfolio value for each month
          const now = new Date();
          for (let i = months - 1; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthName = monthDate.toLocaleDateString("pt-BR", {
              month: "short",
              year: "2-digit",
            });

            let portfolioValue = 0;

            // Calculate manual investments value for this month
            if (manualInvestments) {
              const positionMap = new Map<string, { quantity: number; avgPrice: number }>();
              
              manualInvestments
                .filter((inv) => new Date(inv.transaction_date) <= monthEnd)
                .forEach((inv) => {
                  const existing = positionMap.get(inv.ticker) || { quantity: 0, avgPrice: 0 };
                  const quantity = inv.transaction_type === "buy" ? inv.quantity : -inv.quantity;
                  
                  if (inv.transaction_type === "buy") {
                    const totalQuantity = existing.quantity + quantity;
                    existing.avgPrice = totalQuantity > 0
                      ? ((existing.avgPrice * existing.quantity) + (inv.price * quantity)) / totalQuantity
                      : inv.price;
                  }
                  
                  existing.quantity += quantity;
                  positionMap.set(inv.ticker, existing);
                });

              positionMap.forEach((position) => {
                if (position.quantity > 0) {
                  portfolioValue += position.quantity * position.avgPrice;
                }
              });
            }

            // Add Pluggy investments value (simplified - using current balance)
            if (pluggyInvestments.length > 0) {
              portfolioValue += pluggyInvestments.reduce(
                (sum, inv) => sum + (inv.balance || 0),
                0,
              );
            }

            evolutionData.push({
              month: monthName,
              portfolio: portfolioValue,
              benchmark: portfolioValue * 0.95, // Simplified benchmark
            });
          }

          if (evolutionData.length > 0) {
            setPortfolioEvolution(evolutionData);
            return evolutionData;
          }
        }

        // Fallback to mock data if no real data available
        const fallbackData = await b3Client.getPortfolioEvolution(period);
        setPortfolioEvolution(fallbackData);
        return fallbackData;
      } catch (error) {
        console.error("Erro ao carregar evolução patrimonial:", error);
        toast({
          title: "Erro ao Carregar Evolução",
          description:
            "Não foi possível carregar dados de evolução patrimonial.",
          variant: "destructive",
        });
        const fallbackData = await b3Client.getPortfolioEvolution(period);
        setPortfolioEvolution(fallbackData);
        return fallbackData;
      } finally {
        setLoading(false);
      }
    },
    [toast, user],
  );

  // Buscar ativos detalhados com integração Yahoo Finance
  const getEnhancedAssetsData = useCallback(async () => {
    setLoading(true);
    try {
      let allEnhancedAssets: any[] = [];

      // First, get manual investments from database
      if (user) {
        const { data: manualInvestments, error: manualError } = await supabase
          .from("manual_investments")
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false });

        if (!manualError && manualInvestments) {
          // Group by ticker and calculate positions
          const positionMap = new Map<string, any>();

          manualInvestments.forEach((inv) => {
            const existing = positionMap.get(inv.ticker) || {
              ticker: inv.ticker,
              name: inv.name || inv.ticker,
              type: inv.type,
              subtype: inv.subtype,
              quantity: 0,
              totalCost: 0,
              transactions: [],
            };

            const quantity = inv.transaction_type === "buy" ? inv.quantity : -inv.quantity;
            existing.quantity += quantity;
            existing.totalCost += inv.transaction_type === "buy" ? inv.total_value : -inv.total_value;
            existing.transactions.push(inv);

            positionMap.set(inv.ticker, existing);
          });

          // Get current prices for manual investments
          const tickers = Array.from(positionMap.keys()).map(t => `${t}.SA`);
          let priceData: any[] = [];

          if (tickers.length > 0) {
            try {
              const { data: yfinanceResponse, error: yfinanceError } =
                await supabase.functions.invoke("yfinance-data", {
                  body: { tickers },
                });

              if (!yfinanceError && yfinanceResponse?.assets) {
                priceData = yfinanceResponse.assets;
              }
            } catch (err) {
              console.warn("Erro ao buscar preços:", err);
            }
          }

          // Transform manual investments to enhanced assets format
          positionMap.forEach((position, ticker) => {
            if (position.quantity > 0) {
              const tickerWithSA = `${ticker}.SA`;
              const priceInfo = priceData.find(p => p.ticker === tickerWithSA);
              
              const currentPrice = priceInfo?.preco_atual || (position.totalCost / position.quantity);
              const marketValue = currentPrice * position.quantity;
              const cost = position.totalCost;
              const averagePrice = cost / position.quantity;
              const profitLoss = marketValue - cost;
              const profitability = cost > 0 ? (profitLoss / cost) * 100 : 0;
              const accumulatedDividends = priceInfo?.dividendos_12m || 0;
              const yieldOnCost = cost > 0 && accumulatedDividends > 0 
                ? (accumulatedDividends / cost) * 100 
                : 0;

              allEnhancedAssets.push({
                symbol: ticker,
                name: priceInfo?.nome || position.name,
                type: position.type,
                subtype: position.subtype,
                currentPrice,
                quantity: position.quantity,
                marketValue,
                cost,
                averagePrice,
                yieldOnCost,
                accumulatedDividends,
                profitLoss,
                profitability,
                isManual: true,
              });
            }
          });
        }

        // Then try to get real investment data from Pluggy
        const { data: pluggyItems } = await supabase
          .from("pluggy_items")
          .select("item_id")
          .eq("user_id", user.id);

        if (pluggyItems && pluggyItems.length > 0) {
          // Get investment data from Pluggy for each connected item
          const investmentPromises = pluggyItems.map((item) =>
            supabase.functions.invoke("pluggy-investments", {
              body: { itemId: item.item_id },
            }),
          );

          const investmentResults = await Promise.all(investmentPromises);
          const allInvestments = investmentResults.flatMap(
            (result) => result.data?.investments || [],
          );

          if (allInvestments.length > 0) {
            // Extract tickers from investment names/codes and format for Yahoo Finance
            const tickers = allInvestments
              .map((inv) => {
                const name = inv.name || inv.code || "";
                // Try to extract ticker from name (e.g., "PETR4", "VALE3", "MXRF11")
                const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
                if (tickerMatch && tickerMatch[0]) {
                  return `${tickerMatch[0]}.SA`; // Add .SA for Brazilian stocks
                }
                return null;
              })
              .filter(Boolean) as string[];

            let yfinanceData: any[] = [];
            if (tickers.length > 0) {
              try {
                // Get enhanced data from Yahoo Finance
                const { data: yfinanceResponse, error: yfinanceError } =
                  await supabase.functions.invoke("yfinance-data", {
                    body: { tickers },
                  });

                if (!yfinanceError && yfinanceResponse?.assets) {
                  yfinanceData = yfinanceResponse.assets;
                }
              } catch (yfinanceErr) {
                console.warn(
                  "Erro ao buscar dados do Yahoo Finance:",
                  yfinanceErr,
                );
              }
            }

            const pluggyEnhancedData = allInvestments.map((inv) => {
              const name = inv.name || inv.code || "N/A";
              const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
              const ticker = tickerMatch ? `${tickerMatch[0]}.SA` : null;

              const yfinanceAsset = ticker
                ? yfinanceData.find((asset) => asset.ticker === ticker)
                : null;

              const currentPrice =
                yfinanceAsset?.preco_atual || inv.balance / (inv.quantity || 1);
              const quantity = inv.quantity || 1;
              const marketValue = currentPrice * quantity;
              const cost = inv.balance || marketValue;
              const profitLoss = marketValue - cost;
              const profitability = cost > 0 ? (profitLoss / cost) * 100 : 0;
              const accumulatedDividends = yfinanceAsset?.dividendos_12m || 0;
              const yieldOnCost =
                cost > 0 && accumulatedDividends > 0
                  ? (accumulatedDividends / cost) * 100
                  : 0;

              return {
                symbol: tickerMatch ? tickerMatch[0] : name,
                name: yfinanceAsset?.nome || inv.name || "Investimento",
                type: inv.type,
                subtype: inv.subtype,
                currentPrice,
                quantity,
                marketValue,
                cost,
                averagePrice: cost / quantity,
                yieldOnCost,
                accumulatedDividends,
                profitLoss,
                profitability,
                isManual: false,
              };
            });

            allEnhancedAssets = [...allEnhancedAssets, ...pluggyEnhancedData];
          }
        }
      }

      // If we have data, use it; otherwise fallback to mock
      if (allEnhancedAssets.length > 0) {
        setEnhancedAssets(allEnhancedAssets);
        return allEnhancedAssets;
      }

      // Fallback to mock data if no real data available
      const assetsData = await b3Client.getEnhancedAssets();
      setEnhancedAssets(assetsData);
      return assetsData;
    } catch (error) {
      console.error("Erro ao carregar ativos detalhados:", error);
      toast({
        title: "Erro ao Carregar Ativos",
        description: "Não foi possível carregar dados detalhados dos ativos.",
        variant: "destructive",
      });
      // Return mock data as fallback
      const fallbackData = await b3Client.getEnhancedAssets();
      setEnhancedAssets(fallbackData);
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  // Buscar histórico de dividendos
  const getDividendHistoryData = useCallback(async () => {
    setLoading(true);
    try {
      let dividendData: any[] = [];

      if (user) {
        // Get manual investments to calculate potential dividends
        const { data: manualInvestments } = await supabase
          .from("manual_investments")
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: true });

        if (manualInvestments && manualInvestments.length > 0) {
          // Calculate current positions
          const positionMap = new Map<string, { quantity: number; ticker: string }>();
          
          manualInvestments.forEach((inv) => {
            const existing = positionMap.get(inv.ticker) || { quantity: 0, ticker: inv.ticker };
            const quantity = inv.transaction_type === "buy" ? inv.quantity : -inv.quantity;
            existing.quantity += quantity;
            positionMap.set(inv.ticker, existing);
          });

          // Get dividend data from Yahoo Finance for active positions
          const activeTickers = Array.from(positionMap.values())
            .filter(p => p.quantity > 0)
            .map(p => `${p.ticker}.SA`);

          if (activeTickers.length > 0) {
            try {
              const { data: yfinanceResponse } = await supabase.functions.invoke("yfinance-data", {
                body: { tickers: activeTickers },
              });

              if (yfinanceResponse?.assets) {
                // Generate monthly dividend history for the last 12 months
                const now = new Date();
                for (let i = 11; i >= 0; i--) {
                  const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const monthName = monthDate.toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "2-digit",
                  });

                  let totalDividends = 0;
                  yfinanceResponse.assets.forEach((asset: any) => {
                    const ticker = asset.ticker.replace(".SA", "");
                    const position = positionMap.get(ticker);
                    if (position && position.quantity > 0 && asset.dividendos_12m) {
                      // Distribute annual dividends across 12 months (simplified)
                      totalDividends += (asset.dividendos_12m / 12);
                    }
                  });

                  dividendData.push({
                    month: monthName,
                    dividends: totalDividends,
                  });
                }
              }
            } catch (err) {
              console.warn("Erro ao buscar dados de dividendos:", err);
            }
          }
        }

        if (dividendData.length > 0) {
          setDividendHistory(dividendData);
          return dividendData;
        }
      }

      // Fallback to mock data
      const historyData = await b3Client.getDividendHistoryData();
      setDividendHistory(historyData);
      return historyData;
    } catch (error) {
      console.error("Erro ao carregar histórico de dividendos:", error);
      toast({
        title: "Erro ao Carregar Histórico",
        description: "Não foi possível carregar histórico de dividendos.",
        variant: "destructive",
      });
      const fallbackData = await b3Client.getDividendHistoryData();
      setDividendHistory(fallbackData);
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  // Buscar dados de benchmark
  const getBenchmarkData = useCallback(
    async (benchmark: string = "CDI") => {
      setLoading(true);
      try {
        const data = await b3Client.getBenchmarkData(benchmark);
        setBenchmarkData(data);
        return data;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Benchmark",
          description: "Não foi possível carregar dados de benchmark.",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Limpar cache quando necessário
  const clearCache = useCallback(() => {
    setQuotesCache(new Map());
  }, []);

  return {
    assets,
    portfolio,
    dividends,
    portfolioEvolution,
    enhancedAssets,
    dividendHistory,
    benchmarkData,
    loading,
    connected,
    getAssetQuotes,
    getPortfolio,
    getDividends,
    getPortfolioEvolutionData,
    getEnhancedAssetsData,
    getDividendHistoryData,
    getBenchmarkData,
    searchAssets,
    getAssetDetails,
    clearCache,
  };
};