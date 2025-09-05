import { supabase } from '@/integrations/supabase/client';
import { 
  OpenBankingAccount, 
  OpenBankingTransaction, 
  OpenBankingConsent 
} from './types';

export class OpenBankingClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OPEN_BANKING_BASE_URL || 'https://matls-auth.sandbox.directory.openbankingbrasil.org.br';
    this.clientId = import.meta.env.VITE_OPEN_BANKING_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_OPEN_BANKING_CLIENT_SECRET || '';
    this.redirectUri = import.meta.env.VITE_OPEN_BANKING_REDIRECT_URI || `${window.location.origin}/connect/callback`;
  }

  // Iniciar fluxo de consentimento
  async initiateConsent(permissions: string[], institutionId: string): Promise<{ consentUrl: string; consentId: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('open-banking-consent', {
        body: {
          permissions,
          institutionId,
          redirectUri: this.redirectUri,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao iniciar consentimento:', error);
      throw new Error('Falha ao iniciar processo de consentimento');
    }
  }

  // Verificar status do consentimento
  async getConsentStatus(consentId: string): Promise<OpenBankingConsent> {
    try {
      const { data, error } = await supabase.functions.invoke('open-banking-consent-status', {
        body: { consentId },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao verificar status do consentimento:', error);
      throw new Error('Falha ao verificar status do consentimento');
    }
  }

  // Buscar contas do usuário
  async getAccounts(consentId: string): Promise<OpenBankingAccount[]> {
    try {
      const { data, error } = await supabase.functions.invoke('open-banking-accounts', {
        body: { consentId },
      });

      if (error) throw error;
      return data.accounts || [];
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      throw new Error('Falha ao buscar contas bancárias');
    }
  }

  // Buscar transações de uma conta
  async getTransactions(
    consentId: string, 
    accountId: string, 
    fromDate?: string, 
    toDate?: string
  ): Promise<OpenBankingTransaction[]> {
    try {
      const { data, error } = await supabase.functions.invoke('open-banking-transactions', {
        body: { 
          consentId, 
          accountId, 
          fromDate, 
          toDate 
        },
      });

      if (error) throw error;
      return data.transactions || [];
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      throw new Error('Falha ao buscar transações bancárias');
    }
  }

  // Buscar saldo de uma conta
  async getAccountBalance(consentId: string, accountId: string): Promise<{ available: number; blocked: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('open-banking-balance', {
        body: { consentId, accountId },
      });

      if (error) throw error;
      return data.balance;
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      throw new Error('Falha ao buscar saldo da conta');
    }
  }

  // Revogar consentimento
  async revokeConsent(consentId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('open-banking-revoke', {
        body: { consentId },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao revogar consentimento:', error);
      throw new Error('Falha ao revogar consentimento');
    }
  }
}

export const openBankingClient = new OpenBankingClient();