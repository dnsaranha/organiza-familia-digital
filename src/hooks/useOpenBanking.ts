import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

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

export interface PluggyInvestment {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
  subtype: string;
  institution: {
    name: string;
  };
}


export const useOpenBanking = () => {
  const [accounts, setAccounts] = useState<PluggyAccount[]>([]);
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([]);
  const [investments, setInvestments] = useState<PluggyInvestment[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const loadInvestments = useCallback(async (currentItemId: string) => {
    if (!currentItemId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-investments', {
        body: { itemId: currentItemId },
      });
      if (error) throw error;
      setInvestments(data.investments);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Investimentos',
        description: 'Não foi possível carregar seus investimentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar itemId do banco de dados quando o usuário for autenticado
  useEffect(() => {
    const fetchItemId = async () => {
      if (user) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('pluggy_item_id')
            .eq('id', user.id)
            .single();

          if (error) {
            throw error;
          }

          if (data && data.pluggy_item_id) {
            const currentItemId = data.pluggy_item_id;
            setItemId(currentItemId);
            setConnected(true);
            await Promise.all([
              loadAccounts(currentItemId),
              loadInvestments(currentItemId)
            ]);
          }
        } catch (error) {
          toast({
            title: 'Erro ao buscar conexão',
            description: 'Não foi possível verificar sua conexão com o Open Banking.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchItemId();
  }, [user, loadAccounts, loadInvestments, toast]);

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
    if (!user) {
      toast({
        title: 'Usuário não autenticado',
        description: 'Você precisa estar logado para conectar uma conta.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const newItemId = data.item.id;

      const { error } = await supabase
        .from('profiles')
        .update({ pluggy_item_id: newItemId })
        .eq('id', user.id);

      if (error) throw error;

      setItemId(newItemId);
      setConnected(true);

      await Promise.all([
        loadAccounts(newItemId),
        loadInvestments(newItemId)
      ]);

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
    if (!itemId || !user) return;
    setLoading(true);
    try {
      // Deletar o item na Pluggy
      await supabase.functions.invoke('pluggy-delete-item', {
        body: { itemId },
      });

      // Remover o ID do banco de dados
      await supabase
        .from('profiles')
        .update({ pluggy_item_id: null })
        .eq('id', user.id);

      // Limpar o estado local
      setItemId(null);
      setConnected(false);
      setAccounts([]);
      setTransactions([]);
      setInvestments([]);
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
    investments,
    loading,
    connected,
    itemId,
    connectToken,
    initiateConnection,
    handleSuccess,
    loadAccounts,
    loadTransactions,
    loadInvestments,
    disconnect,
    setConnectToken,
  };
};