import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Tipos simplificados para a resposta da Pluggy, ajuste conforme necessário
export interface PluggyAccount {
  id: string;
  balance: number;
  currency: string;
  name: string;
  type: string;
  number: string;
  subtype: string;
  marketingName: string;
}

export interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}


export const useOpenBanking = () => {
  const [accounts, setAccounts] = useState<PluggyAccount[]>([]);
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAccounts = useCallback(async (currentItemId: string) => {
    if (!currentItemId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-accounts', {
        body: { itemId: currentItemId },
      });
      if (error) throw error;
      setAccounts(data.accounts);
      setConnected(true);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Contas',
        description: 'Não foi possível carregar suas contas da Pluggy.',
        variant: 'destructive',
      });
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Verificar se já existe um item ativo
  useEffect(() => {
    const savedItemId = localStorage.getItem('pluggyItemId');
    if (savedItemId) {
      setItemId(savedItemId);
      setConnected(true);
      loadAccounts(savedItemId);
    }
  }, [loadAccounts]);

  const initiateConnection = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-connect-token');
      if (error) throw error;
      setConnectToken(data.accessToken);
    } catch (error) {
      toast({
        title: 'Erro na Conexão',
        description: 'Não foi possível obter o token de conexão da Pluggy.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSuccess = useCallback(async (data: { item: { id: string } }) => {
    setLoading(true);
    try {
      const newItemId = data.item.id;
      setItemId(newItemId);
      localStorage.setItem('pluggyItemId', newItemId);
      setConnected(true);

      await loadAccounts(newItemId);

      toast({
        title: 'Conexão Bem-sucedida!',
        description: 'Sua conta foi conectada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao Processar Conexão',
        description: 'Sua conexão foi criada, mas houve um erro ao buscar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setConnectToken(null); // Fechar o widget
    }
  }, [toast, loadAccounts, setConnectToken]);

  const loadTransactions = useCallback(async (accountId: string) => {
    if (!itemId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-transactions', {
        body: { accountId },
      });
      if (error) throw error;
      setTransactions(data.transactions);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Transações',
        description: 'Não foi possível carregar as transações da sua conta.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [itemId, toast]);

  const disconnect = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      await supabase.functions.invoke('pluggy-delete-item', {
        body: { itemId },
      });
      localStorage.removeItem('pluggyItemId');
      setItemId(null);
      setConnected(false);
      setAccounts([]);
      setTransactions([]);
      toast({
        title: 'Desconectado',
        description: 'Sua conexão com a Pluggy foi removida.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao Desconectar',
        description: 'Não foi possível remover a sua conexão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [itemId, toast]);

  return {
    accounts,
    transactions,
    loading,
    connected,
    itemId,
    connectToken,
    initiateConnection,
    handleSuccess,
    loadAccounts,
    loadTransactions,
    disconnect,
    setConnectToken,
  };
};