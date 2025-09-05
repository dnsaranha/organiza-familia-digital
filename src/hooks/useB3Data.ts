import { useState, useEffect, useCallback } from 'react';
import { b3Client } from '@/lib/b3/client';
import { B3Asset, B3Portfolio, B3Dividend } from '@/lib/open-banking/types';
import { useToast } from '@/hooks/use-toast';

export const useB3Data = () => {
  const [assets, setAssets] = useState<B3Asset[]>([]);
  const [portfolio, setPortfolio] = useState<B3Portfolio | null>(null);
  const [dividends, setDividends] = useState<B3Dividend[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  // Cache para cotações (5 minutos)
  const [quotesCache, setQuotesCache] = useState<Map<string, { data: B3Asset; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const getAssetQuotes = useCallback(async (symbols: string[], useCache = true) => {
    setLoading(true);
    try {
      const now = Date.now();
      const cachedQuotes: B3Asset[] = [];
      const symbolsToFetch: string[] = [];

      if (useCache) {
        symbols.forEach(symbol => {
          const cached = quotesCache.get(symbol);
          if (cached && (now - cached.timestamp) < CACHE_DURATION) {
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
        freshQuotes = await b3Client.getAssetQuotes(symbolsToFetch);
        
        // Atualizar cache
        const newCache = new Map(quotesCache);
        freshQuotes.forEach(quote => {
          newCache.set(quote.symbol, { data: quote, timestamp: now });
        });
        setQuotesCache(newCache);
      }

      const allQuotes = [...cachedQuotes, ...freshQuotes];
      setAssets(allQuotes);
      return allQuotes;
    } catch (error) {
      toast({
        title: 'Erro ao Buscar Cotações',
        description: 'Não foi possível buscar as cotações dos ativos.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [quotesCache, toast]);

  const getPortfolio = useCallback(async (brokerId: string, accessToken: string) => {
    setLoading(true);
    try {
      const portfolioData = await b3Client.getPortfolio(brokerId, accessToken);
      setPortfolio(portfolioData);
      setConnected(true);
      return portfolioData;
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Carteira',
        description: 'Não foi possível carregar sua carteira de investimentos.',
        variant: 'destructive',
      });
      setConnected(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getDividends = useCallback(async (
    brokerId: string, 
    accessToken: string, 
    fromDate?: string, 
    toDate?: string
  ) => {
    setLoading(true);
    try {
      const dividendsData = await b3Client.getDividends(brokerId, accessToken, fromDate, toDate);
      setDividends(dividendsData);
      return dividendsData;
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Dividendos',
        description: 'Não foi possível carregar os dividendos recebidos.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const searchAssets = useCallback(async (query: string, assetType?: string) => {
    setLoading(true);
    try {
      const searchResults = await b3Client.searchAssets(query, assetType);
      return searchResults;
    } catch (error) {
      toast({
        title: 'Erro na Busca',
        description: 'Não foi possível buscar ativos.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getAssetDetails = useCallback(async (symbol: string) => {
    setLoading(true);
    try {
      const assetDetails = await b3Client.getAssetDetails(symbol);
      return assetDetails;
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Detalhes',
        description: 'Não foi possível carregar detalhes do ativo.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Limpar cache quando necessário
  const clearCache = useCallback(() => {
    setQuotesCache(new Map());
  }, []);

  return {
    assets,
    portfolio,
    dividends,
    loading,
    connected,
    getAssetQuotes,
    getPortfolio,
    getDividends,
    searchAssets,
    getAssetDetails,
    clearCache,
  };
};