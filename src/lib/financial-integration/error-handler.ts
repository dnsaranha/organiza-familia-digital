import { toast } from 'sonner';

export interface FinancialError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

export class FinancialErrorHandler {
  private static errorMap: Record<string, FinancialError> = {
    // Erros de Open Banking
    'CONSENT_EXPIRED': {
      code: 'CONSENT_EXPIRED',
      message: 'Seu consentimento expirou. É necessário autorizar novamente.',
      retryable: true,
    },
    'INVALID_TOKEN': {
      code: 'INVALID_TOKEN',
      message: 'Token de acesso inválido. Tente reconectar sua conta.',
      retryable: true,
    },
    'RATE_LIMIT_EXCEEDED': {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas requisições. Tente novamente em alguns minutos.',
      retryable: true,
    },
    'INSTITUTION_UNAVAILABLE': {
      code: 'INSTITUTION_UNAVAILABLE',
      message: 'Instituição financeira temporariamente indisponível.',
      retryable: true,
    },
    
    // Erros de B3/Cotações
    'QUOTE_SERVICE_DOWN': {
      code: 'QUOTE_SERVICE_DOWN',
      message: 'Serviço de cotações temporariamente indisponível.',
      retryable: true,
    },
    'INVALID_SYMBOL': {
      code: 'INVALID_SYMBOL',
      message: 'Símbolo do ativo não encontrado.',
      retryable: false,
    },
    'MARKET_CLOSED': {
      code: 'MARKET_CLOSED',
      message: 'Mercado fechado. Exibindo última cotação disponível.',
      retryable: false,
    },
    
    // Erros de rede
    'NETWORK_ERROR': {
      code: 'NETWORK_ERROR',
      message: 'Erro de conexão. Verifique sua internet.',
      retryable: true,
    },
    'TIMEOUT': {
      code: 'TIMEOUT',
      message: 'Tempo limite excedido. Tente novamente.',
      retryable: true,
    },
  };

  static handle(error: any): FinancialError {
    console.error('Financial Integration Error:', error);

    // Tentar identificar o tipo de erro
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.message?.includes('consent')) {
      errorCode = 'CONSENT_EXPIRED';
    } else if (error.message?.includes('token')) {
      errorCode = 'INVALID_TOKEN';
    } else if (error.message?.includes('rate limit')) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (error.message?.includes('network') || error.name === 'NetworkError') {
      errorCode = 'NETWORK_ERROR';
    } else if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      errorCode = 'TIMEOUT';
    } else if (error.status === 404) {
      errorCode = 'INVALID_SYMBOL';
    } else if (error.status === 503) {
      errorCode = 'INSTITUTION_UNAVAILABLE';
    }

    const knownError = this.errorMap[errorCode];
    
    if (knownError) {
      return {
        ...knownError,
        details: error,
      };
    }

    // Erro desconhecido
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Erro inesperado. Tente novamente ou entre em contato com o suporte.',
      details: error,
      retryable: true,
    };
  }

  static showUserFriendlyError(error: FinancialError): void {
    toast.error(error.message, {
      description: error.retryable ? 'Você pode tentar novamente.' : 'Entre em contato com o suporte se o problema persistir.',
      duration: error.retryable ? 5000 : 8000,
    });
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const financialError = this.handle(error);
        
        // Se não é retryable, falhar imediatamente
        if (!financialError.retryable) {
          throw error;
        }
        
        // Se é a última tentativa, falhar
        if (attempt === maxRetries) {
          break;
        }
        
        // Calcular delay com backoff exponencial
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms...`);
      }
    }
    
    throw lastError;
  }
}