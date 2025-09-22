import { useState, useEffect, useMemo } from "react";
import { useB3Data } from "@/hooks/useB3Data";
import { useOpenBanking } from "@/hooks/useOpenBanking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PortfolioEvolutionChart from "@/components/charts/PortfolioEvolutionChart";
import AssetAllocationChart from "@/components/charts/AssetAllocationChart";
import DividendHistoryChart from "@/components/charts/DividendHistoryChart";
import EnhancedAssetTable from "@/components/EnhancedAssetTable";
import { mapInvestmentType } from "@/lib/investment-mapping";
import { mapAccountSubtype } from "@/lib/account-mapping";

const InvestmentsPage = () => {
  const {
    assets,
    portfolio,
    dividends,
    portfolioEvolution,
    enhancedAssets,
    dividendHistory,
    benchmarkData,
    loading: b3Loading,
    connected: b3Connected,
    getAssetQuotes,
    getPortfolio,
    getDividends,
    getPortfolioEvolutionData,
    getEnhancedAssetsData,
    getDividendHistoryData,
    getBenchmarkData,
    clearCache,
  } = useB3Data();

  const {
    connected: bankConnected,
    loading: bankLoading,
    accounts,
    transactions: bankTransactions,
    investments,
    refreshAllData,
  } = useOpenBanking();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const { toast } = useToast();

  const bankTotalBalance = useMemo(() => {
    return accounts.reduce(
      (sum, acc) => sum + (typeof acc.balance === "number" ? acc.balance : 0),
      0,
    );
  }, [accounts]);

  // Símbolos padrão para demonstração
  const defaultSymbols = [
    "PETR4",
    "VALE3",
    "KNRI11",
    "BOVA11",
    "ITUB4",
    "BBDC4",
  ];

  useEffect(() => {
    // Carregar dados iniciais
    const loadInitialData = async () => {
      await Promise.all([
        getAssetQuotes(defaultSymbols),
        getPortfolioEvolutionData(),
        getEnhancedAssetsData(),
        getDividendHistoryData(),
        getBenchmarkData(),
      ]);
    };

    loadInitialData();
  }, [
    getAssetQuotes,
    getPortfolioEvolutionData,
    getEnhancedAssetsData,
    getDividendHistoryData,
    getBenchmarkData,
  ]);

  const filteredTransactions = useMemo(() => {
    if (!selectedAccountId) {
      return [];
    }
    return bankTransactions.filter((tx) => tx.accountId === selectedAccountId);
  }, [bankTransactions, selectedAccountId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      clearCache();

      // Atualizar todos os dados
      await Promise.all([
        getAssetQuotes(defaultSymbols, false),
        getPortfolioEvolutionData(),
        getEnhancedAssetsData(),
        getDividendHistoryData(),
        getBenchmarkData(),
      ]);

      // Se conectado a uma corretora, atualizar carteira também
      if (b3Connected && portfolio) {
        const brokerId = localStorage.getItem("connectedBrokerId");
        const accessToken = localStorage.getItem("brokerAccessToken");
        if (brokerId && accessToken) {
          await getPortfolio(brokerId, accessToken);
          await getDividends(brokerId, accessToken);
        }
      }

      // Atualizar dados bancários também
      if (bankConnected && refreshAllData) {
        await refreshAllData();
      }

      toast({
        title: "Dados Atualizados",
        description: "Todos os dados foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na Atualização",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const totalDividends = useMemo(() => {
    if (dividendHistory.length > 0) {
      const currentMonth = dividendHistory[dividendHistory.length - 1];
      return currentMonth?.totalDividends || 0;
    }
    return dividends.reduce((sum, div) => sum + div.amount, 0);
  }, [dividends, dividendHistory]);

  const portfolioTotals = useMemo(() => {
    if (enhancedAssets.length > 0) {
      return {
        totalInvested: enhancedAssets.reduce(
          (sum, asset) => sum + asset.cost,
          0,
        ),
        currentValue: enhancedAssets.reduce(
          (sum, asset) => sum + asset.marketValue,
          0,
        ),
        totalDividends: enhancedAssets.reduce(
          (sum, asset) => sum + asset.accumulatedDividends,
          0,
        ),
      };
    }
    return {
      totalInvested: portfolio?.totalCost || 0,
      currentValue: portfolio?.totalValue || 0,
      totalDividends: totalDividends,
    };
  }, [enhancedAssets, portfolio, totalDividends]);

  const isLoading = b3Loading || bankLoading || refreshing;

  // Status de conexão
  const connectionStatus = useMemo(() => {
    if (b3Connected && bankConnected) return "Totalmente Conectado";
    if (b3Connected || bankConnected) return "Parcialmente Conectado";
    return "Não Conectado";
  }, [b3Connected, bankConnected]);

  const getConnectionColor = () => {
    if (b3Connected && bankConnected) return "text-success";
    if (b3Connected || bankConnected) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Carteira de Investimentos</h1>
          <p className="text-muted-foreground">
            Dados reais da B3 e Open Banking -{" "}
            <span className={getConnectionColor()}>{connectionStatus}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alerta de conexão */}
      {!b3Connected && !bankConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Para ver dados reais, conecte sua corretora e/ou banco através da
            página "Conectar". Atualmente exibindo cotações em tempo real da B3.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total Investido
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {portfolioTotals.totalInvested.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {enhancedAssets.length > 0
                ? "Custo total da carteira"
                : "Conecte sua corretora para ver dados reais"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
            {portfolioTotals.currentValue > 0 && (
              <span
                className={
                  portfolioTotals.currentValue >= portfolioTotals.totalInvested
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                {portfolioTotals.currentValue >= portfolioTotals.totalInvested
                  ? "+"
                  : ""}
                {(
                  ((portfolioTotals.currentValue -
                    portfolioTotals.totalInvested) /
                    portfolioTotals.totalInvested) *
                  100
                ).toFixed(2)}
                %
              </span>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {portfolioTotals.currentValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {portfolioTotals.currentValue > 0
                ? `Ganho/Perda: ${(portfolioTotals.currentValue - portfolioTotals.totalInvested).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                : "Valor atual da carteira"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dividendos Recebidos (Mês)
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {totalDividends.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Total de proventos no mês atual.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Open Banking */}
      {bankConnected && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold">Consolidado Open Banking</h2>
            <p className="text-muted-foreground">
              Saldos, transações e investimentos dos seus bancos conectados.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Saldo Consolidado (Bancos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bankTotalBalance.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Soma dos saldos das contas conectadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contas Bancárias */}
          <Card>
            <CardHeader>
              <CardTitle>Contas Bancárias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Banco</TableHead>
                      <TableHead className="min-w-[100px]">Conta</TableHead>
                      <TableHead className="min-w-[120px]">Tipo</TableHead>
                      <TableHead className="text-right min-w-[120px]">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {bankLoading ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <TableRow
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`cursor-pointer ${selectedAccountId === acc.id ? "bg-muted/50" : ""}`}
                      >
                        <TableCell>{acc.marketingName ?? "N/A"}</TableCell>
                        <TableCell>{acc.number}</TableCell>
                        <TableCell>{mapAccountSubtype(acc.subtype)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {typeof acc.balance === "number"
                            ? acc.balance.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: acc.currency || "BRL",
                              })
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Nenhuma conta encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Transações da Conta Selecionada */}
            <Card>
              <CardHeader>
                <CardTitle>Últimas Transações</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedAccountId
                    ? `Da conta ${accounts.find((a) => a.id === selectedAccountId)?.number}`
                    : "Selecione uma conta para ver as transações"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Descrição</TableHead>
                        <TableHead className="min-w-[100px]">Data</TableHead>
                        <TableHead className="text-right min-w-[120px]">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {bankLoading && selectedAccountId ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-16" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-5 w-20 inline-block" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredTransactions.length > 0 ? (
                      filteredTransactions.slice(0, 10).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>
                            {new Date(tx.date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${typeof tx.amount === "number" && tx.amount < 0 ? "text-red-500" : "text-green-500"}`}
                          >
                            {typeof tx.amount === "number"
                              ? tx.amount.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                          {selectedAccountId
                            ? "Nenhuma transação encontrada."
                            : "Selecione uma conta."}
                        </TableCell>
                      </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Investimentos do Open Banking */}
            <Card>
              <CardHeader>
                <CardTitle>Investimentos (Open Banking)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Ativo</TableHead>
                        <TableHead className="min-w-[100px]">Tipo</TableHead>
                        <TableHead className="text-right min-w-[100px]">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {bankLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-16" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-5 w-20 inline-block" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : investments.length > 0 ? (
                      investments.map((inv) => {
                        const mappedType = mapInvestmentType(
                          inv.type,
                          inv.subtype,
                        );
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {mappedType.label_pt}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{mappedType.descricao_pt}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {typeof inv.balance === "number"
                                ? inv.balance.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: inv.currency || "BRL",
                                  })
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                          Nenhum investimento encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Dashboards */}
      <Tabs defaultValue="evolution" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="evolution" className="flex items-center gap-2 text-xs lg:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Evolução Patrimonial</span>
            <span className="sm:hidden">Evolução</span>
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-2 text-xs lg:text-sm">
            <PieChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Alocação de Ativos</span>
            <span className="sm:hidden">Alocação</span>
          </TabsTrigger>
          <TabsTrigger value="dividends" className="flex items-center gap-2 text-xs lg:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico de Proventos</span>
            <span className="sm:hidden">Proventos</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2 text-xs lg:text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Meus Ativos</span>
            <span className="sm:hidden">Ativos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-6">
          <PortfolioEvolutionChart
            data={portfolioEvolution}
            loading={isLoading}
          />
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <AssetAllocationChart assets={enhancedAssets} loading={isLoading} />
        </TabsContent>

        <TabsContent value="dividends" className="space-y-6">
          <DividendHistoryChart data={dividendHistory} loading={isLoading} />
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <EnhancedAssetTable assets={enhancedAssets} loading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestmentsPage;
