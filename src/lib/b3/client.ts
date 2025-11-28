import { supabase } from "@/integrations/supabase/client";
import {
  mockEnhancedAssets,
  mockPortfolioEvolution,
  mockDividendHistory,
} from "@/lib/mock-data";

export const b3Client = {
  // Buscar cotações de ativos
  async getQuotes(
    symbols: string[],
  ): Promise<
    {
      symbol: string;
      name: string;
      regularMarketPrice: number;
      regularMarketChangePercent: number;
    }[]
  > {
    if (!symbols || symbols.length === 0) {
      return [];
    }

    try {
      const { data, error } = await supabase.functions.invoke("b3-quotes", {
        body: { symbols },
      });

      if (error) {
        console.warn(
          "Erro ao buscar cotações via Supabase, usando dados mock:",
          error,
        );
        // Return mock data with realistic prices
        return symbols.map((symbol) => ({
          symbol,
          name: `${symbol} - Dados Simulados`,
          regularMarketPrice: 30 + Math.random() * 100,
          regularMarketChangePercent: (Math.random() - 0.5) * 10,
        }));
      }
      return data.quotes || [];
    } catch (error) {
      console.error("Erro ao buscar cotações B3:", error);
      // Return mock data as fallback
      return symbols.map((symbol) => ({
        symbol,
        name: `${symbol} - Dados Simulados`,
        regularMarketPrice: 30 + Math.random() * 100,
        regularMarketChangePercent: (Math.random() - 0.5) * 10,
      }));
    }
  },

  // Buscar dados de benchmark (CDI, SELIC, etc.)
  async getBenchmarkData(
    benchmark: string = "CDI",
  ): Promise<{ value: number; change: number }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "yfinance-data",
        {
          body: { benchmark },
        },
      );

      if (error) {
        console.warn(
          "Erro ao buscar benchmark, usando dados mock:",
          JSON.stringify(error, null, 2),
        );
        return { value: 10.75, change: 0.25 }; // Mock CDI data
      }
      return data;
    } catch (error) {
      console.error("Erro ao buscar benchmark:", error);
      return { value: 10.75, change: 0.25 }; // Mock CDI data
    }
  },

  // Buscar dados de evolução patrimonial
  async getPortfolioEvolution(period: string = "12m"): Promise<any[]> {
    try {
      // For now, return mock data - in production this would fetch real data
      return mockPortfolioEvolution;
    } catch (error) {
      console.error("Erro ao buscar evolução patrimonial:", error);
      return mockPortfolioEvolution;
    }
  },

  // Buscar ativos detalhados da carteira
  async getEnhancedAssets(): Promise<any[]> {
    try {
      // For now, return mock data - in production this would fetch real data
      return mockEnhancedAssets;
    } catch (error) {
      console.error("Erro ao buscar ativos detalhados:", error);
      return mockEnhancedAssets;
    }
  },

  // Buscar histórico de dividendos
  async getDividendHistoryData(): Promise<any[]> {
    try {
      return mockDividendHistory;
    } catch (error) {
      console.error("Erro ao buscar histórico de dividendos:", error);
      return mockDividendHistory;
    }
  },
};