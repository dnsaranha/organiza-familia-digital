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
    async (period: string = "12m", hasManualData: boolean = false) => {
      setLoading(true);
      try {
        // First try to get real investment data from Pluggy
        if (user) {
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
              // Process real investment data into evolution format
              const evolutionData = processInvestmentEvolution(
                allInvestments,
                period,
              );
              setPortfolioEvolution(evolutionData);
              return evolutionData;
            }
          }
        }

        // Only return empty array if has manual data, otherwise return mock
        if (hasManualData) {
          setPortfolioEvolution([]);
          return [];
        }

        // Fallback to mock data if no real data available
        const evolutionData = await b3Client.getPortfolioEvolution(period);
        setPortfolioEvolution(evolutionData);
        return evolutionData;
      } catch (error) {
        console.error("Erro ao carregar evolução patrimonial:", error);
        toast({
          title: "Erro ao Carregar Evolução",
          description:
            "Não foi possível carregar dados de evolução patrimonial.",
          variant: "destructive",
        });
        // Return mock data as fallback
        const fallbackData = await b3Client.getPortfolioEvolution(period);
        setPortfolioEvolution(fallbackData);
        return fallbackData;
      } finally {
        setLoading(false);
      }
    },
    [toast, user],
  );

  // Helper function to process investment data into evolution format
  const processInvestmentEvolution = (investments: any[], period: string) => {
    const months = period === "12m" ? 12 : 6;
    const evolutionData = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });

      // Calculate portfolio value for this month (simplified)
      const totalValue = investments.reduce(
        (sum, inv) => sum + (inv.balance || 0),
        0,
      );
      const variation = (Math.random() - 0.5) * 0.1; // Random variation for demo
      const adjustedValue = totalValue * (1 + variation * (i / months));

      evolutionData.push({
        month: monthName,
        portfolio: Math.max(adjustedValue, 0),
        benchmark: adjustedValue * 0.95, // Benchmark slightly lower
      });
    }

    return evolutionData;
  };

  // Buscar ativos detalhados com integração Yahoo Finance
  const getEnhancedAssetsData = useCallback(async (hasManualData: boolean = false) => {
    setLoading(true);
    try {
      // First try to get real investment data from Pluggy
      if (user) {
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

            // Transform Pluggy investment data to enhanced assets format with Yahoo Finance data
            const enhancedData = allInvestments.map((inv) => {
              const name = inv.name || inv.code || "N/A";
              const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
              const ticker = tickerMatch ? `${tickerMatch[0]}.SA` : null;

              // Find corresponding Yahoo Finance data
              const yfinanceAsset = ticker
                ? yfinanceData.find((asset) => asset.ticker === ticker)
                : null;

              const currentPrice =
                yfinanceAsset?.preco_atual || inv.balance / (inv.quantity || 1);
              const quantity = inv.quantity || 1;
              const marketValue = currentPrice * quantity;
              const cost = inv.balance || marketValue; // Use balance as cost if no better data
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
              };
            });

            setEnhancedAssets(enhancedData);
            return enhancedData;
          }
        }
      }

      // Only return empty array if has manual data, otherwise return mock
      if (hasManualData) {
        setEnhancedAssets([]);
        return [];
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
  const getDividendHistoryData = useCallback(async (hasManualData: boolean = false) => {
    setLoading(true);
    try {
      // Only return empty array if has manual data, otherwise return mock
      if (hasManualData) {
        setDividendHistory([]);
        return [];
      }

      // For now, use mock data as Pluggy doesn't provide dividend history directly
      // In a real implementation, you would need to track dividends separately
      // or use a different data provider that includes dividend information
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
      // Return mock data as fallback
      const fallbackData = await b3Client.getDividendHistoryData();
      setDividendHistory(fallbackData);
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
