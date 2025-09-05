// Sistema de cache para dados financeiros
export class FinancialCache {
  private static instance: FinancialCache;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): FinancialCache {
    if (!FinancialCache.instance) {
      FinancialCache.instance = new FinancialCache();
    }
    return FinancialCache.instance;
  }

  // Armazenar dados no cache
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Recuperar dados do cache
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // Verificar se existe no cache e não expirou
  has(key: string): boolean {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return false;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Limpar cache expirado
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Limpar todo o cache
  clear(): void {
    this.cache.clear();
  }

  // Limpar cache por padrão de chave
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Obter estatísticas do cache
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Gerar chave de cache para cotações
  static generateQuoteKey(symbols: string[]): string {
    return `quotes:${symbols.sort().join(',')}`;
  }

  // Gerar chave de cache para carteira
  static generatePortfolioKey(brokerId: string, userId: string): string {
    return `portfolio:${brokerId}:${userId}`;
  }

  // Gerar chave de cache para contas bancárias
  static generateAccountsKey(consentId: string): string {
    return `accounts:${consentId}`;
  }

  // Gerar chave de cache para transações
  static generateTransactionsKey(
    consentId: string, 
    accountId: string, 
    fromDate?: string, 
    toDate?: string
  ): string {
    const dateRange = fromDate && toDate ? `:${fromDate}:${toDate}` : '';
    return `transactions:${consentId}:${accountId}${dateRange}`;
  }
}

// Instância singleton do cache
export const financialCache = FinancialCache.getInstance();

// Limpeza automática do cache a cada 10 minutos
setInterval(() => {
  financialCache.cleanup();
}, 10 * 60 * 1000);