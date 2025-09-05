import { useState, useEffect, useCallback } from 'react';
import { openBankingClient } from '@/lib/open-banking/client';
import { OpenBankingAccount, OpenBankingTransaction } from '@/lib/open-banking/types';
import { useToast } from '@/hooks/use-toast';

export const useOpenBanking = () => {
  const [accounts, setAccounts] = useState<OpenBankingAccount[]>([]);
  const [transactions, setTransactions] = useState<OpenBankingTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [consentId, setConsentId] = useState<string | null>(null);
  const { toast } = useToast();

  // Verificar se já existe um consentimento ativo
  useEffect(() => {
    const savedConsentId = localStorage.getItem('openBankingConsentId');
    if (savedConsentId) {
      setConsentId(savedConsentId);
      setConnected(true);
      loadAccounts(savedConsentId);
    }
  }, []);

  const initiateConnection = useCallback(async (institutionId: string) => {
    setLoading(true);
    try {
      const permissions = [
        'ACCOUNTS_READ',
        'ACCOUNTS_BALANCES_READ',
        'RESOURCES_READ',
        'CUSTOMERS_PERSONAL_IDENTIFICATIONS_READ',
        'CUSTOMERS_PERSONAL_ADITTIONALINFO_READ'
      ];

      const { consentUrl, consentId: newConsentId } = await openBankingClient.initiateConsent(
        permissions, 
        institutionId
      );

      setConsentId(newConsentId);
      localStorage.setItem('openBankingConsentId', newConsentId);
      
      // Redirecionar para autorização
      window.location.href = consentUrl;
    } catch (error) {
      toast({
        title: 'Erro na Conexão',
        description: 'Não foi possível iniciar a conexão com o banco.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAccounts = useCallback(async (currentConsentId: string) => {
    if (!currentConsentId) return;

    setLoading(true);
    try {
      const accountsData = await openBankingClient.getAccounts(currentConsentId);
      setAccounts(accountsData);
      setConnected(true);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Contas',
        description: 'Não foi possível carregar suas contas bancárias.',
        variant: 'destructive',
      });
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadTransactions = useCallback(async (
    accountId: string, 
    fromDate?: string, 
    toDate?: string
  ) => {
    if (!consentId) return;

    setLoading(true);
    try {
      const transactionsData = await openBankingClient.getTransactions(
        consentId, 
        accountId, 
        fromDate, 
        toDate
      );
      setTransactions(transactionsData);
    } catch (error) {
      toast({
        title: 'Erro ao Carregar Transações',
        description: 'Não foi possível carregar as transações bancárias.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [consentId, toast]);

  const disconnect = useCallback(async () => {
    if (!consentId) return;

    setLoading(true);
    try {
      await openBankingClient.revokeConsent(consentId);
      localStorage.removeItem('openBankingConsentId');
      setConsentId(null);
      setConnected(false);
      setAccounts([]);
      setTransactions([]);
      
      toast({
        title: 'Desconectado',
        description: 'Conexão com o banco foi removida com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao Desconectar',
        description: 'Não foi possível remover a conexão com o banco.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [consentId, toast]);

  return {
    accounts,
    transactions,
    loading,
    connected,
    consentId,
    initiateConnection,
    loadAccounts,
    loadTransactions,
    disconnect,
  };
};