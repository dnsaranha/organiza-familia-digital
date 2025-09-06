import { supabase } from '@/integrations/supabase/client';
import {
  B3Asset,
} from '../open-banking/types';

// Define types for the new functions
export interface InvestmentTransaction {
  id?: string;
  user_id?: string;
  created_at?: string;
  symbol: string;
  quantity: number;
  price: number;
  type: 'buy' | 'sell';
  cost?: number;
  date: string; // YYYY-MM-DD
  asset_type: string;
}

export interface Dividend {
    amount: number;
    date: string;
}

export interface HistoricalData {
    timestamps: number[];
    prices: number[];
}


export class FinancialDataClient {
  constructor() {
    // constructor is empty now, but might be used later
  }

  // Buscar cotações em tempo real
  async getAssetQuotes(symbols: string[]): Promise<B3Asset[]> {
    try {
      // Note: The supabase function is still named 'b3-quotes', but it uses Yahoo Finance.
      // I'll leave it as is for now to avoid breaking changes, but it should be renamed in the future.
      const { data, error } = await supabase.functions.invoke('b3-quotes', {
        body: { symbols },
      });

      if (error) throw error;
      return data.quotes || [];
    } catch (error) {
      console.error('Error fetching asset quotes:', error);
      throw new Error('Failed to fetch asset quotes');
    }
  }

  // Buscar dados históricos de um ativo
  async getAssetHistory(
    symbol: string,
    from: string,
    to: string,
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<HistoricalData> {
    try {
      const { data, error } = await supabase.functions.invoke('get-historical-data', {
        body: { symbol, from, to, interval },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching asset history:', error);
      throw new Error('Failed to fetch asset history');
    }
  }

  // Adicionar uma transação de investimento
  async addInvestmentTransaction(transaction: InvestmentTransaction): Promise<InvestmentTransaction> {
    try {
        const { data, error } = await supabase.functions.invoke('add-investment-transaction', {
            body: transaction,
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding investment transaction:', error);
        throw new Error('Failed to add investment transaction');
    }
  }

  // Buscar todas as transações de investimento
  async getInvestmentTransactions(): Promise<InvestmentTransaction[]> {
    try {
        const { data, error } = await supabase.functions.invoke('get-investment-transactions');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching investment transactions:', error);
        throw new Error('Failed to fetch investment transactions');
    }
  }

  // Buscar histórico de dividendos
  async getDividendsHistory(symbol: string, from: string, to: string): Promise<Dividend[]> {
    try {
        const { data, error } = await supabase.functions.invoke('get-dividends-history', {
            body: { symbol, from, to },
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching dividends history:', error);
        throw new Error('Failed to fetch dividends history');
    }
  }


  // Buscar histórico do CDI
  async getCDIHistory(lastDays: number): Promise<HistoricalData> {
    try {
        const { data, error } = await supabase.functions.invoke('get-cdi-history', {
            body: { lastDays },
        });

        if (error) throw error;
        return data || { timestamps: [], prices: [] };
    } catch (error) {
        console.error('Error fetching CDI history:', error);
        throw new Error('Failed to fetch CDI history');
    }
  }
}

export const financialDataClient = new FinancialDataClient();
