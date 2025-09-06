import { useState, useEffect, useCallback } from 'react';
import { financialDataClient, InvestmentTransaction, Dividend } from '@/lib/financial-data/client';
import { B3Asset } from '@/lib/open-banking/types'; // Using B3Asset for quotes for now
import { useToast } from '@/hooks/use-toast';

// Define the structure of a portfolio position
export interface PortfolioPosition {
  symbol: string;
  assetType: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

// Define the structure of the entire portfolio
export interface Portfolio {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export const useFinancialData = () => {
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [dividends, setDividends] = useState<(Dividend & { symbol: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculatePortfolio = useCallback((
    transactions: InvestmentTransaction[],
    quotes: Map<string, B3Asset>
  ): Portfolio => {
    const positionsMap = new Map<string, PortfolioPosition>();

    // Sort transactions by date to process them in order
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(tx => {
      let position = positionsMap.get(tx.symbol);

      if (!position) {
        position = {
          symbol: tx.symbol,
          assetType: tx.asset_type,
          quantity: 0,
          averagePrice: 0,
          totalCost: 0,
          currentPrice: 0,
          marketValue: 0,
          gainLoss: 0,
          gainLossPercent: 0,
        };
      }

      if (tx.type === 'buy') {
        const newTotalCost = position.totalCost + (tx.quantity * tx.price) + (tx.cost || 0);
        const newQuantity = position.quantity + tx.quantity;
        position.quantity = newQuantity;
        position.totalCost = newTotalCost;
        position.averagePrice = newQuantity > 0 ? newTotalCost / newQuantity : 0;
      } else { // sell
        position.quantity -= tx.quantity;
        // Cost basis is reduced proportionally
        position.totalCost = position.averagePrice * position.quantity;
      }
      positionsMap.set(tx.symbol, position);
    });

    const positions = Array.from(positionsMap.values()).filter(p => p.quantity > 0);

    // Now, update with live market data
    positions.forEach(pos => {
      const quote = quotes.get(pos.symbol);
      if (quote) {
        pos.currentPrice = quote.regularMarketPrice;
        pos.marketValue = pos.quantity * quote.regularMarketPrice;
        pos.gainLoss = pos.marketValue - pos.totalCost;
        pos.gainLossPercent = pos.totalCost > 0 ? (pos.gainLoss / pos.totalCost) * 100 : 0;
      }
    });

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      positions,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
    };
  }, []);

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedTransactions = await financialDataClient.getInvestmentTransactions();
      setTransactions(fetchedTransactions);

      if (fetchedTransactions.length > 0) {
        const symbols = [...new Set(fetchedTransactions.map(tx => tx.symbol))];
        const fetchedQuotes = await financialDataClient.getAssetQuotes(symbols);
        const quotesMap = new Map(fetchedQuotes.map(q => [q.symbol, q]));

        const calculatedPortfolio = calculatePortfolio(fetchedTransactions, quotesMap);
        setPortfolio(calculatedPortfolio);

        // Fetch dividends for all assets in portfolio
        const fromDate = "2000-01-01"; // A long time ago
        const toDate = new Date().toISOString().split('T')[0];
        const allDividends: (Dividend & { symbol: string })[] = [];
        for (const symbol of symbols) {
            const symbolDividends = await financialDataClient.getDividendsHistory(symbol, fromDate, toDate);
            allDividends.push(...symbolDividends.map(d => ({...d, symbol})));
        }
        setDividends(allDividends);
      } else {
        setPortfolio(null);
        setDividends([]);
      }

    } catch (error) {
      toast({
        title: 'Erro ao Carregar Dados Financeiros',
        description: 'Não foi possível carregar seus dados de investimentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, calculatePortfolio]);

  const addTransaction = useCallback(async (transaction: InvestmentTransaction) => {
    setLoading(true);
    try {
      await financialDataClient.addInvestmentTransaction(transaction);
      toast({
        title: 'Transação Adicionada',
        description: 'Sua transação foi adicionada com sucesso.',
      });
      // Reload all data after adding a transaction
      await loadFinancialData();
    } catch (error) {
      toast({
        title: 'Erro ao Adicionar Transação',
        description: 'Não foi possível adicionar a transação.',
        variant: 'destructive',
      });
      setLoading(false); // Ensure loading is set to false on error
    }
    // setLoading(false) is in the loadFinancialData finally block
  }, [loadFinancialData, toast]);

  return {
    transactions,
    portfolio,
    dividends,
    loading,
    loadFinancialData,
    addTransaction,
  };
};
