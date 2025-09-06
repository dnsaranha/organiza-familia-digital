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
  const [userItemIds, setUserItemIds] = useState<string[]>([]);
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

  const loadAllAccounts = useCallback(async (itemIds: string[]) => {
    if (!itemIds || itemIds.length === 0) {
      setAccounts([]);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        itemIds.map((id) =>
          supabase.functions.invoke('pluggy-accounts', { body: { itemId: id } })
        )
      );
      const merged = results.flatMap((r) => r.data?.accounts ?? []);
      setAccounts(merged);
      setConnected(true);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Contas',
        description: 'Falha ao carregar contas conectadas.',
        variant: 'destructive',
      });
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAllInvestments = useCallback(async (itemIds: string[]) => {
    if (!itemIds || itemIds.length === 0) {
      setInvestments([]);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        itemIds.map((id) =>
          supabase.functions.invoke('pluggy-investments', { body: { itemId: id } })
        )
      );
      const merged = results.flatMap((r) => r.data?.investments ?? []);
      setInvestments(merged);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Investimentos',
        description: 'Falha ao carregar investimentos conectados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar itens (connections) do banco quando o usuário autenticar
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1) Novo fluxo: múltiplos connections em pluggy_items
        const { data: itemsRows, error: itemsError } = await supabase
          .from('pluggy_items')
          .select('item_id')
          .eq('user_id', user.id);

        if (itemsError) throw itemsError;

        const ids = (itemsRows ?? []).map((r) => r.item_id);
        if (ids.length > 0) {
          setUserItemIds(ids);
          setItemId(ids[0] ?? null);
          setConnected(true);
          await Promise.all([
            loadAllAccounts(ids),
            loadAllInvestments(ids),
          ]);
          return;
        }

        // 2) Legado: único pluggy_item_id no profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('pluggy_item_id')
          .eq('id', user.id)
          .single();

        if (profileErr) throw profileErr;

        if (profile && profile.pluggy_item_id) {
          const currentItemId = profile.pluggy_item_id;
          setItemId(currentItemId);
          setConnected(true);
          await Promise.all([
            loadAccounts(currentItemId),
            loadInvestments(currentItemId),
          ]);
        } else {
          setConnected(false);
        }
      } catch (error) {
        toast({
          title: 'Erro ao buscar conexão',
          description: 'Não foi possível verificar sua conexão com o Open Finance.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, supabase, loadAccounts, loadInvestments, loadAllAccounts, loadAllInvestments, toast]);

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

  const handleSuccess = useCallback(async (data: { item: { id: string; institution?: { name?: string } } }) => {
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

      // 1) Persistir em pluggy_items (multi-conexões)
      const { error: insertErr } = await supabase
        .from('pluggy_items')
        .insert({ user_id: user.id, item_id: newItemId, institution_name: data.item?.institution?.name ?? null });
      if (insertErr) throw insertErr;

      // 2) Atualizar campo legado para compatibilidade
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ pluggy_item_id: newItemId })
        .eq('id', user.id);
      if (profileErr) throw profileErr;

      // 3) Recarregar itens e dados consolidados
      const { data: itemsRows } = await supabase
        .from('pluggy_items')
        .select('item_id')
        .eq('user_id', user.id);
      const ids = (itemsRows ?? []).map((r) => r.item_id);
      setUserItemIds(ids);
      setItemId(newItemId);
      setConnected(true);

      await Promise.all([
        loadAllAccounts(ids.length ? ids : [newItemId]),
        loadAllInvestments(ids.length ? ids : [newItemId]),
      ]);

      toast({
        title: 'Conexão Bem-sucedida!',
        description: 'Sua conta foi conectada e sincronizada.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao Processar Conexão',
        description: 'Conexão criada, mas houve erro ao salvar/carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setConnectToken(null); // Fechar o widget
    }
  }, [toast, user, supabase, loadAllAccounts, loadAllInvestments]);

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
    if (!user) return;
    setLoading(true);
    try {
      // Buscar todas as conexões do usuário
      const { data: itemsRows } = await supabase
        .from('pluggy_items')
        .select('item_id')
        .eq('user_id', user.id);
      const ids = (itemsRows ?? []).map((r) => r.item_id);

      // Deletar todos os items na Pluggy em paralelo
      await Promise.all(
        ids.map((id) =>
          supabase.functions.invoke('pluggy-delete-item', { body: { itemId: id } })
        )
      );

      // Remover registros do banco
      await supabase.from('pluggy_items').delete().eq('user_id', user.id);
      await supabase.from('profiles').update({ pluggy_item_id: null }).eq('id', user.id);

      // Limpar o estado local
      setUserItemIds([]);
      setItemId(null);
      setConnected(false);
      setAccounts([]);
      setTransactions([]);
      setInvestments([]);
      toast({
        title: 'Desconectado',
        description: 'Todas as conexões com a Pluggy foram removidas.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao Desconectar',
        description: 'Não foi possível remover sua(s) conexão(ões).',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

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