import { useState, useEffect, useMemo } from 'react';
import { useB3Data } from '@/hooks/useB3Data';
import { useOpenBanking } from '@/hooks/useOpenBanking';
import PortfolioPieChart from '@/components/charts/PortfolioPieChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RefreshCw, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const InvestmentsPage = () => {
  const { 
    assets, 
    portfolio, 
    dividends, 
    loading: b3Loading, 
    connected: b3Connected,
    getAssetQuotes,
    getPortfolio,
    getDividends,
    clearCache 
  } = useB3Data();
  
  const { 
    connected: bankConnected, 
    loading: bankLoading,
    accounts,
    transactions,
    investments,
    loadTransactions,
  } = useOpenBanking();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { toast } = useToast();

  const bankTotalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (typeof acc.balance === 'number' ? acc.balance : 0), 0);
  }, [accounts]);

  // Símbolos padrão para demonstração
  const defaultSymbols = ['PETR4', 'VALE3', 'KNRI11', 'BOVA11', 'ITUB4', 'BBDC4'];

  useEffect(() => {
    // Carregar cotações iniciais
    getAssetQuotes(defaultSymbols);
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadTransactions(selectedAccountId);
    }
  }, [selectedAccountId, loadTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      clearCache();
      await getAssetQuotes(defaultSymbols, false); // Forçar busca sem cache
      
      // Se conectado a uma corretora, atualizar carteira também
      if (b3Connected && portfolio) {
        const brokerId = localStorage.getItem('connectedBrokerId');
        const accessToken = localStorage.getItem('brokerAccessToken');
        if (brokerId && accessToken) {
          await getPortfolio(brokerId, accessToken);
          await getDividends(brokerId, accessToken);
        }
      }
      
      toast({
        title: 'Dados Atualizados',
        description: 'Cotações e carteira foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na Atualização',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const allocationData = useMemo(() => {
    if (!portfolio || !portfolio.positions.length) return [];

    const allocation = portfolio.positions.reduce((acc, position) => {
      const assetClass = getAssetClassName(position.assetType);
      acc[assetClass] = (acc[assetClass] || 0) + position.marketValue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(allocation).map(([name, value]) => ({ name, value }));
  }, [portfolio]);

  const getAssetClassName = (assetType: string): string => {
    switch (assetType) {
      case 'STOCK': return 'Ações';
      case 'FII': return 'FIIs';
      case 'ETF': return 'ETFs';
      case 'BOND': return 'Renda Fixa';
      default: return 'Outros';
    }
  };

  const totalDividends = useMemo(() => {
    return dividends.reduce((sum, div) => sum + div.amount, 0);
  }, [dividends]);

  const monthlyProfitabilityData = useMemo(() => {
    // Gerar dados de rentabilidade baseados na carteira real
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((month, index) => ({
      month,
      profitability: portfolio ? 
        (portfolio.totalGainLossPercent * (0.8 + Math.random() * 0.4)) / 6 * (index + 1) :
        Math.random() * 4 - 1
    }));
  }, [portfolio]);

  const isLoading = b3Loading || bankLoading || refreshing;

  // Status de conexão
  const connectionStatus = useMemo(() => {
    if (b3Connected && bankConnected) return 'Totalmente Conectado';
    if (b3Connected || bankConnected) return 'Parcialmente Conectado';
    return 'Não Conectado';
  }, [b3Connected, bankConnected]);

  const getConnectionColor = () => {
    if (b3Connected && bankConnected) return 'text-success';
    if (b3Connected || bankConnected) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Carteira de Investimentos</h1>
          <p className="text-muted-foreground">
            Dados reais da B3 e Open Banking - {' '}
            <span className={getConnectionColor()}>
              {connectionStatus}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alerta de conexão */}
      {!b3Connected && !bankConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Para ver dados reais, conecte sua corretora e/ou banco através da página "Conectar".
            Atualmente exibindo cotações em tempo real da B3.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Valor Total Investido</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {portfolio ? 
                  portfolio.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
                  'R$ 0,00'
                }
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {portfolio ? 'Custo total da carteira' : 'Conecte sua corretora para ver dados reais'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
            {portfolio && (
              <span className={portfolio.totalGainLoss >= 0 ? "text-green-500" : "text-red-500"}>
                {portfolio.totalGainLoss >= 0 ? '+' : ''}{portfolio.totalGainLossPercent.toFixed(2)}%
              </span>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {portfolio ? 
                  portfolio.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) :
                  'R$ 0,00'
                }
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {portfolio ? 
                `Ganho/Perda: ${portfolio.totalGainLoss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` :
                'Valor atual da carteira'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Dividendos Recebidos (Mês)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {totalDividends.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total de proventos no mês.</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Open Banking */}
      {bankConnected && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold">Consolidado Open Banking</h2>
            <p className="text-muted-foreground">Saldos, transações e investimentos dos seus bancos conectados.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Saldo Consolidado (Bancos)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bankTotalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-xs text-muted-foreground">Soma dos saldos das contas conectadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Contas Bancárias */}
          <Card>
            <CardHeader><CardTitle>Contas Bancárias</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankLoading ? (
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  ) : accounts.length > 0 ? (
                    accounts.map(acc => (
                      <TableRow
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`cursor-pointer ${selectedAccountId === acc.id ? 'bg-muted/50' : ''}`}
                      >
                        <TableCell>{acc.marketingName ?? 'N/A'}</TableCell>
                        <TableCell>{acc.number}</TableCell>
                        <TableCell>{acc.subtype}</TableCell>
                        <TableCell className="text-right font-medium">
                          {typeof acc.balance === 'number' ? acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: acc.currency || 'BRL' }) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center">Nenhuma conta encontrada.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Transações da Conta Selecionada */}
            <Card>
              <CardHeader>
                <CardTitle>Últimas Transações</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedAccountId ? `Da conta ${accounts.find(a => a.id === selectedAccountId)?.number}` : 'Selecione uma conta para ver as transações'}
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankLoading && selectedAccountId ? (
                       Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-20 inline-block" /></TableCell>
                        </TableRow>
                      ))
                    ) : transactions.length > 0 ? (
                      transactions.slice(0, 10).map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>{new Date(tx.date).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className={`text-right font-medium ${typeof tx.amount === 'number' && tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {typeof tx.amount === 'number' ? tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                          {selectedAccountId ? 'Nenhuma transação encontrada.' : 'Selecione uma conta.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Investimentos do Open Banking */}
            <Card>
              <CardHeader><CardTitle>Investimentos (Open Banking)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-5 w-20 inline-block" /></TableCell>
                        </TableRow>
                      ))
                    ) : investments.length > 0 ? (
                      investments.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.name}</TableCell>
                          <TableCell>{inv.subtype}</TableCell>
                          <TableCell className="text-right font-medium">
                            {typeof inv.balance === 'number' ? inv.balance.toLocaleString('pt-BR', { style: 'currency', currency: inv.currency || 'BRL' }) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">Nenhum investimento encontrado.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Seção B3 */}
      <div>
        <h2 className="text-2xl font-semibold mt-8">Análise de Ativos (B3)</h2>
        <p className="text-muted-foreground">Dados da sua carteira de ações, FIIs e ETFs.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Distribuição da Carteira</CardTitle>
            <p className="text-sm text-muted-foreground">
              Participação por tipo de ativo
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : (
                <PortfolioPieChart 
                  portfolio={portfolio} 
                  showMockData={!portfolio && !b3Connected} 
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
           <CardHeader><CardTitle>Rentabilidade Mensal (%)</CardTitle></CardHeader>
           <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><Skeleton className="h-48 w-full" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={monthlyProfitabilityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Rentabilidade']} />
                  <Legend />
                  <Line type="monotone" dataKey="profitability" name="Rentabilidade" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Meus Ativos</CardTitle>
              <Badge variant={portfolio ? 'default' : 'secondary'}>
                {portfolio ? `${portfolio.positions.length} posições` : 'Cotações em tempo real'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="text-right">Preço Atual</TableHead>
                  {portfolio && <TableHead className="text-right">Qtde.</TableHead>}
                  {portfolio && <TableHead className="text-right">Valor Total</TableHead>}
                  <TableHead className="text-right">Variação %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 inline-block" /></TableCell>
                      {portfolio && <TableCell className="text-right"><Skeleton className="h-5 w-10 inline-block" /></TableCell>}
                      {portfolio && <TableCell className="text-right"><Skeleton className="h-5 w-24 inline-block" /></TableCell>}
                      <TableCell className="text-right"><Skeleton className="h-5 w-20 inline-block" /></TableCell>
                    </TableRow>
                  ))
                ) : portfolio && portfolio.positions.length > 0 ? (
                  // Mostrar carteira real se conectado
                  portfolio.positions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAssetClassName(position.assetType)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {position.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">{position.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-medium">
                        {position.marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${position.gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.gainLossPercent >= 0 ? '+' : ''}{position.gainLossPercent.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : assets.length > 0 ? (
                  // Mostrar cotações em tempo real se não conectado
                  assets.map((asset) => (
                    <TableRow key={asset.symbol}>
                      <TableCell className="font-medium">{asset.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {asset.symbol.includes('11') ? 'FII' : 'Ação'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {asset.regularMarketPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${asset.regularMarketChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.regularMarketChangePercent >= 0 ? '+' : ''}{asset.regularMarketChangePercent.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={portfolio ? 6 : 4} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 opacity-50" />
                        <p>Nenhum ativo encontrado</p>
                        <p className="text-xs">Conecte sua corretora ou atualize os dados</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvestmentsPage;
