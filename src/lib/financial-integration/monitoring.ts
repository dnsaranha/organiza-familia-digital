// Sistema de monitoramento para integrações financeiras
export class FinancialMonitoring {
  private static metrics: Map<string, any[]> = new Map();

  // Registrar métrica de performance
  static recordApiCall(
    endpoint: string,
    duration: number,
    success: boolean,
    errorCode?: string
  ): void {
    const metric = {
      endpoint,
      duration,
      success,
      errorCode,
      timestamp: Date.now(),
    };

    const key = `api_calls:${endpoint}`;
    const existing = this.metrics.get(key) || [];
    existing.push(metric);
    
    // Manter apenas últimas 1000 métricas por endpoint
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }
    
    this.metrics.set(key, existing);
  }

  // Obter estatísticas de um endpoint
  static getEndpointStats(endpoint: string): {
    totalCalls: number;
    successRate: number;
    averageResponseTime: number;
    errorBreakdown: Record<string, number>;
  } {
    const key = `api_calls:${endpoint}`;
    const calls = this.metrics.get(key) || [];
    
    if (calls.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorBreakdown: {},
      };
    }

    const successfulCalls = calls.filter(call => call.success);
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
    
    const errorBreakdown = calls
      .filter(call => !call.success && call.errorCode)
      .reduce((acc, call) => {
        acc[call.errorCode] = (acc[call.errorCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalCalls: calls.length,
      successRate: (successfulCalls.length / calls.length) * 100,
      averageResponseTime: totalDuration / calls.length,
      errorBreakdown,
    };
  }

  // Verificar saúde geral do sistema
  static getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'down';
    details: Record<string, any>;
  } {
    const endpoints = [
      'open-banking-accounts',
      'open-banking-transactions',
      'b3-quotes',
      'b3-portfolio',
    ];

    const endpointStats = endpoints.map(endpoint => ({
      endpoint,
      stats: this.getEndpointStats(endpoint),
    }));

    // Calcular status geral
    const avgSuccessRate = endpointStats.reduce(
      (sum, { stats }) => sum + stats.successRate, 0
    ) / endpointStats.length;

    const avgResponseTime = endpointStats.reduce(
      (sum, { stats }) => sum + stats.averageResponseTime, 0
    ) / endpointStats.length;

    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    
    if (avgSuccessRate < 50) {
      status = 'down';
    } else if (avgSuccessRate < 90 || avgResponseTime > 10000) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        averageSuccessRate: avgSuccessRate,
        averageResponseTime: avgResponseTime,
        endpoints: endpointStats,
        lastCheck: new Date().toISOString(),
      },
    };
  }

  // Limpar métricas antigas
  static cleanup(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(key, filtered);
    }
  }

  // Exportar métricas para análise
  static exportMetrics(): Record<string, any> {
    const exported: Record<string, any> = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      exported[key] = metrics;
    }
    
    return exported;
  }

  // Wrapper para medir performance de funções
  static async measureApiCall<T>(
    endpoint: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let errorCode: string | undefined;

    try {
      const result = await operation();
      success = true;
      return result;
    } catch (error: any) {
      errorCode = error.code || error.message || 'UNKNOWN_ERROR';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.recordApiCall(endpoint, duration, success, errorCode);
    }
  }
}

// Limpeza automática de métricas antigas a cada hora
setInterval(() => {
  FinancialMonitoring.cleanup();
}, 60 * 60 * 1000);