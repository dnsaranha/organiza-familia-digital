import { supabase } from '@/integrations/supabase/client';
import { 
  B3Asset, 
  B3Portfolio, 
  B3Position, 
  B3Dividend 
} from '../open-banking/types';

export class B3Client {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_B3_API_BASE_URL || 'https://api.b3.com.br';
    this.apiKey = import.meta.env.VITE_B3_API_KEY || '';
  }

  // Buscar cotações em tempo real
  async getAssetQuotes(symbols: string[]): Promise<B3Asset[]> {
    try {
      const { data, error } = await supabase.functions.invoke('b3-quotes', {
        body: { symbols },
      });

      if (error) throw error;
      return data.quotes || [];
    } catch (error) {
      console.error('Erro ao buscar cotações B3:', error);
      throw new Error('Falha ao buscar cotações da B3');
    }
  }

  // Buscar dados históricos de um ativo
  async getAssetHistory(
    symbol: string, 
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max',
    interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo'
  ): Promise<{ timestamps: number[]; prices: number[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('b3-history', {
        body: { symbol, period, interval },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar histórico B3:', error);
      throw new Error('Falha ao buscar histórico do ativo');
    }
  }

  // Buscar carteira de investimentos (via corretora integrada)
  async getPortfolio(brokerId: string, accessToken: string): Promise<B3Portfolio> {
    try {
      const { data, error } = await supabase.functions.invoke('b3-portfolio', {
        body: { brokerId, accessToken },
      });

      if (error) throw error;
      return data.portfolio;
    } catch (error) {
      console.error('Erro ao buscar carteira B3:', error);
      throw new Error('Falha ao buscar carteira de investimentos');
    }
  }

  // Buscar dividendos recebidos
  async getDividends(
    brokerId: string, 
    accessToken: string, 
    fromDate?: string, 
    toDate?: string
  ): Promise<B3Dividend[]> {
    try {
      const { data, error } = await supabase.functions.invoke('b3-dividends', {
        body: { brokerId, accessToken, fromDate, toDate },
      });

      if (error) throw error;
      return data.dividends || [];
    } catch (error) {
      console.error('Erro ao buscar dividendos B3:', error);
      throw new Error('Falha ao buscar dividendos');
    }
  }

  // Buscar informações detalhadas de um ativo
  async getAssetDetails(symbol: string): Promise<B3Asset> {
    try {
      const { data, error } = await supabase.functions.invoke('b3-asset-details', {
        body: { symbol },
      });

      if (error) throw error;
      return data.asset;
    } catch (error) {
      console.error('Erro ao buscar detalhes do ativo B3:', error);
      throw new Error('Falha ao buscar detalhes do ativo');
    }
  }

  // Buscar lista de ativos disponíveis
  async searchAssets(query: string, assetType?: string): Promise<B3Asset[]> {
    try {
      const { data, error } = await supabase.functions.invoke('b3-search', {
        body: { query, assetType },
      });

      if (error) throw error;
      return data.assets || [];
    } catch (error) {
      console.error('Erro ao buscar ativos B3:', error);
      throw new Error('Falha ao buscar ativos');
    }
  }
}

export const b3Client = new B3Client();