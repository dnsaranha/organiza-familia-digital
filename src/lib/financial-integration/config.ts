// Configurações centralizadas para integrações financeiras

export const OPEN_BANKING_CONFIG = {
  // URLs base para diferentes ambientes
  SANDBOX_BASE_URL: 'https://matls-auth.sandbox.directory.openbankingbrasil.org.br',
  PRODUCTION_BASE_URL: 'https://matls-auth.directory.openbankingbrasil.org.br',
  
  // Permissões padrão
  DEFAULT_PERMISSIONS: [
    'ACCOUNTS_READ',
    'ACCOUNTS_BALANCES_READ',
    'RESOURCES_READ',
    'CUSTOMERS_PERSONAL_IDENTIFICATIONS_READ',
    'CUSTOMERS_PERSONAL_ADITTIONALINFO_READ',
  ],
  
  // Configurações de cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  
  // Timeout para requisições
  REQUEST_TIMEOUT: 30000, // 30 segundos
};

export const B3_CONFIG = {
  // URLs para diferentes fontes de dados
  YAHOO_FINANCE_BASE_URL: 'https://query1.finance.yahoo.com',
  ALPHA_VANTAGE_BASE_URL: 'https://www.alphavantage.co',
  
  // Configurações de cache
  QUOTES_CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  PORTFOLIO_CACHE_DURATION: 15 * 60 * 1000, // 15 minutos
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  
  // Símbolos suportados
  SUPPORTED_ASSET_TYPES: ['STOCK', 'FII', 'ETF', 'BOND', 'OPTION'],
};

export const SECURITY_CONFIG = {
  // Configurações de segurança
  ENCRYPT_SENSITIVE_DATA: true,
  LOG_LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
  
  // Configurações de auditoria
  AUDIT_API_CALLS: true,
  AUDIT_DATA_ACCESS: true,
  
  // Configurações de compliance
  LGPD_COMPLIANCE: true,
  DATA_RETENTION_DAYS: 365,
};

// Mapeamento de instituições financeiras
export const FINANCIAL_INSTITUTIONS = {
  BANKS: [
    { id: 'banco-do-brasil', name: 'Banco do Brasil', cnpj: '00000000000191' },
    { id: 'bradesco', name: 'Bradesco', cnpj: '60746948000112' },
    { id: 'itau', name: 'Itaú Unibanco', cnpj: '60701190000104' },
    { id: 'santander', name: 'Santander', cnpj: '90400888000142' },
    { id: 'caixa', name: 'Caixa Econômica Federal', cnpj: '00360305000104' },
  ],
  
  BROKERS: [
    { id: 'clear', name: 'Clear Corretora', cnpj: '02332886000104' },
    { id: 'rico', name: 'Rico Investimentos', cnpj: '03332174000193' },
    { id: 'xp', name: 'XP Investimentos', cnpj: '02332886000104' },
    { id: 'inter', name: 'Inter Investimentos', cnpj: '00416968000101' },
    { id: 'nubank', name: 'Nu Invest', cnpj: '18236120000158' },
  ],
};

// Configurações de erro e retry
export const ERROR_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 segundo
  EXPONENTIAL_BACKOFF: true,
  
  // Códigos de erro conhecidos
  KNOWN_ERROR_CODES: {
    CONSENT_EXPIRED: 'CONSENT_EXPIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INSTITUTION_UNAVAILABLE: 'INSTITUTION_UNAVAILABLE',
  },
};