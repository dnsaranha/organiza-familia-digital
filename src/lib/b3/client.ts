import { supabase } from "@/integrations/supabase/client";
import {
  B3Asset,
  B3Portfolio,
  B3Position,
  B3Dividend,
} from "../open-banking/types";
import {
  mockPortfolioEvolution,
  mockEnhancedAssets,
  mockDividendHistory,
} from "../mock-data";

export class B3Client {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // Switch to Yahoo Finance API for better data coverage
    this.baseUrl =
      import.meta.env.VITE_YAHOO_FINANCE_API_URL ||
      "https://query1.finance.yahoo.com";
    this.apiKey = import.meta.env.VITE_YAHOO_FINANCE_API_KEY || "";
  }

  // Buscar cotações em tempo real via Yahoo Finance
  async getAssetQuotes(symbols: string[]): Promise<B3Asset[]> {
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
  }

  // Buscar dados de benchmark (CDI, SELIC, etc.)
  async getBenchmarkData(
    benchmark: string = "CDI",
  ): Promise<{ value: number; change: number }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "yahoo-finance-benchmark",
        {
          body: { benchmark },
        },
      );

      if (error) {
        console.warn("Erro ao buscar benchmark, usando dados mock:", error);
        return { value: 10.75, change: 0.25 }; // Mock CDI data
      }
      return data;
    } catch (error) {
      console.error("Erro ao buscar benchmark:", error);
      return { value: 10.75, change: 0.25 }; // Mock CDI data
    }
  }

  // Buscar dados de evolução patrimonial
  async getPortfolioEvolution(period: string = "12m"): Promise<any[]> {
    try {
      // For now, return mock data - in production this would fetch real data
      return mockPortfolioEvolution;
    } catch (error) {
      console.error("Erro ao buscar evolução patrimonial:", error);
      return mockPortfolioEvolution;
    }
  }

  // Buscar ativos detalhados da carteira
  async getEnhancedAssets(): Promise<any[]> {
    try {
      // For now, return mock data - in production this would fetch real data
      return mockEnhancedAssets;
    } catch (error) {
      console.error("Erro ao buscar ativos detalhados:", error);
      return mockEnhancedAssets;
    }
  }

  // Buscar histórico de dividendos
  async getDividendHistoryData(): Promise<any[]> {
    try {
      // For now, return mock data - in production this would fetch real data
      return mockDividendHistory;
    } catch (error) {
      console.error("Erro ao buscar histórico de dividendos:", error);
      return mockDividendHistory;
    }
  }

  // Buscar dados históricos de um ativo
  async getAssetHistory(
    symbol: string,
    period:
      | "1d"
      | "5d"
      | "1mo"
      | "3mo"
      | "6mo"
      | "1y"
      | "2y"
      | "5y"
      | "10y"
      | "ytd"
      | "max",
    interval:
      | "1m"
      | "2m"
      | "5m"
      | "15m"
      | "30m"
      | "60m"
      | "90m"
      | "1h"
      | "1d"
      | "5d"
      | "1wk"
      | "1mo"
      | "3mo",
  ): Promise<{ timestamps: number[]; prices: number[] }> {
    try {
      const { data, error } = await supabase.functions.invoke("b3-history", {
        body: { symbol, period, interval },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Erro ao buscar histórico B3:", error);
      throw new Error("Falha ao buscar histórico do ativo");
    }
  }

  // Buscar carteira de investimentos (via corretora integrada)
  async getPortfolio(
    brokerId: string,
    accessToken: string,
  ): Promise<B3Portfolio> {
    try {
      const { data, error } = await supabase.functions.invoke("b3-portfolio", {
        body: { brokerId, accessToken },
      });

      if (error) throw error;
      return data.portfolio;
    } catch (error) {
      console.error("Erro ao buscar carteira B3:", error);
      throw new Error("Falha ao buscar carteira de investimentos");
    }
  }

  // Buscar dividendos recebidos
  async getDividends(
    brokerId: string,
    accessToken: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<B3Dividend[]> {
    try {
      const { data, error } = await supabase.functions.invoke("b3-dividends", {
        body: { brokerId, accessToken, fromDate, toDate },
      });

      if (error) throw error;
      return data.dividends || [];
    } catch (error) {
      console.error("Erro ao buscar dividendos B3:", error);
      throw new Error("Falha ao buscar dividendos");
    }
  }

  // Buscar informações detalhadas de um ativo
  async getAssetDetails(symbol: string): Promise<B3Asset> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "b3-asset-details",
        {
          body: { symbol },
        },
      );

      if (error) throw error;
      return data.asset;
    } catch (error) {
      console.error("Erro ao buscar detalhes do ativo B3:", error);
      throw new Error("Falha ao buscar detalhes do ativo");
    }
  }

  // Buscar lista de ativos disponíveis
  async searchAssets(query: string, assetType?: string): Promise<B3Asset[]> {
    try {
      const { data, error } = await supabase.functions.invoke("b3-search", {
        body: { query, assetType },
      });

      if (error) throw error;
      return data.assets || [];
    } catch (error) {
      console.error("Erro ao buscar ativos B3:", error);
      throw new Error("Falha ao buscar ativos");
    }
  }
}

export const b3Client = new B3Client();
