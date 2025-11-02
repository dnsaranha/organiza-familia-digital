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
import { InvestmentTransactionForm } from "@/components/InvestmentTransactionForm";
import { ManualInvestmentTransactions } from "@/components/ManualInvestmentTransactions";
import { mapInvestmentType } from "@/lib/investment-mapping";
import { mapAccountSubtype } from "@/lib/account-mapping";
import { cn } from "@/lib/utils";

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
  const [transactionRefresh, setTransactionRefresh] = useState(0);
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
      setTransactionRefresh((prev) => prev + 1);
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
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-8 w-[1168px] h-[1865px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Carteira de Investimentos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Dados B3 e Open Banking -{" "}
            <span className={getConnectionColor()}>{connectionStatus}</span>
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <InvestmentTransactionForm
            onSuccess={() => {
              handleRefresh();
              setTransactionRefresh((prev) => prev + 1);
            }}
          />
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <RefreshCw
              className={`h-4 w-4 sm:mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="ml-2 sm:ml-0">Atualizar</span>
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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-[592px] h-[135px] relative">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Valor Investido
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold">
                {portfolioTotals.totalInvested.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
              {enhancedAssets.length > 0
                ? "Custo total"
                : "Conecte sua corretora"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Valor Atual
            </CardTitle>
            {portfolioTotals.currentValue > 0 && (
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold",
                  portfolioTotals.currentValue >= portfolioTotals.totalInvested
                    ? "text-green-500"
                    : "text-red-500",
                )}
              >
                {portfolioTotals.currentValue >= portfolioTotals.totalInvested
                  ? "+"
                  : ""}
                {(
                  ((portfolioTotals.currentValue -
                    portfolioTotals.totalInvested) /
                    portfolioTotals.totalInvested) *
                  100
                ).toFixed(1)}
                %
              </span>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold">
                {portfolioTotals.currentValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
              {portfolioTotals.currentValue > 0
                ? `${(portfolioTotals.currentValue - portfolioTotals.totalInvested).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                : "Valor atual"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Dividendos (Mês)
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold">
                {totalDividends.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
              Proventos do mês
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Seção Open Banking */}
      {bankConnected && (
        <div className="space-y-4 sm:space-y-8 max-h-[863px] overflow-y-auto relative">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">
              Open Banking
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Dados dos seus bancos conectados
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
          <Card className="max-h-[400px] overflow-y-auto">
            <CardHeader className="pb-3 sticky top-0 bg-card z-10">
              <CardTitle className="text-base sm:text-lg">
                Contas Bancárias
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-xs">
                        Banco
                      </TableHead>
                      <TableHead className="min-w-[80px] text-xs">
                        Conta
                      </TableHead>
                      <TableHead className="min-w-[100px] text-xs">
                        Tipo
                      </TableHead>
                      <TableHead className="text-right min-w-[100px] text-xs">
                        Saldo
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankLoading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : accounts.length > 0 ? (
                      accounts.map((acc) => (
                        <TableRow
                          key={acc.id}
                          onClick={() => setSelectedAccountId(acc.id)}
                          className={`cursor-pointer ${selectedAccountId === acc.id ? "bg-muted/50" : ""}`}
                        >
                          <TableCell className="text-xs sm:text-sm">
                            {acc.marketingName ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {acc.number}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {mapAccountSubtype(acc.subtype)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs sm:text-sm">
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
                        <TableCell
                          colSpan={4}
                          className="text-center text-xs sm:text-sm"
                        >
                          Nenhuma conta encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:gap-8 grid-cols-1 lg:grid-cols-2">
            {/* Transações da Conta Selecionada */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">
                  Últimas Transações
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {selectedAccountId
                    ? `Conta ${accounts.find((a) => a.id === selectedAccountId)?.number}`
                    : "Selecione uma conta"}
                </p>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px] text-xs">
                          Descrição
                        </TableHead>
                        <TableHead className="min-w-[80px] text-xs">
                          Data
                        </TableHead>
                        <TableHead className="text-right min-w-[90px] text-xs">
                          Valor
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankLoading && selectedAccountId ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-14" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-4 w-16 inline-block" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredTransactions.length > 0 ? (
                        filteredTransactions.slice(0, 10).map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs sm:text-sm">
                              {tx.description}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {new Date(tx.date).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-medium text-xs sm:text-sm",
                                typeof tx.amount === "number" && tx.amount < 0
                                  ? "text-red-500"
                                  : "text-green-500",
                              )}
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
                          <TableCell
                            colSpan={3}
                            className="text-center h-20 text-xs sm:text-sm"
                          >
                            {selectedAccountId
                              ? "Nenhuma transação"
                              : "Selecione uma conta"}
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">
                  Investimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] text-xs">
                          Ativo
                        </TableHead>
                        <TableHead className="min-w-[80px] text-xs">
                          Tipo
                        </TableHead>
                        <TableHead className="text-right min-w-[80px] text-xs">
                          Saldo
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-14" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-4 w-16 inline-block" />
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
                              <TableCell className="font-medium text-xs sm:text-sm">
                                {inv.name}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="truncate">
                                    {mappedType.label_pt}
                                  </span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {mappedType.descricao_pt}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs sm:text-sm">
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
                          <TableCell
                            colSpan={3}
                            className="text-center h-20 text-xs sm:text-sm"
                          >
                            Nenhum investimento
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
      <Tabs defaultValue="evolution" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
          <TabsTrigger
            value="evolution"
            className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm py-2 px-1 sm:px-3"
          >
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Evolução</span>
            <span className="sm:hidden">Evol.</span>
          </TabsTrigger>
          <TabsTrigger
            value="allocation"
            className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm py-2 px-1 sm:px-3"
          >
            <PieChartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Alocação</span>
            <span className="sm:hidden">Aloc.</span>
          </TabsTrigger>
          <TabsTrigger
            value="dividends"
            className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm py-2 px-1 sm:px-3"
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Proventos</span>
            <span className="sm:hidden">Prov.</span>
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm py-2 px-1 sm:px-3"
          >
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Ativos</span>
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="flex items-center gap-1 text-[10px] sm:text-xs lg:text-sm py-2 px-1 sm:px-3"
          >
            <span>Manual</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-3 sm:space-y-6">
          <PortfolioEvolutionChart
            data={portfolioEvolution}
            loading={isLoading}
          />
        </TabsContent>

        <TabsContent value="allocation" className="space-y-3 sm:space-y-6">
          <AssetAllocationChart assets={enhancedAssets} loading={isLoading} />
        </TabsContent>

        <TabsContent value="dividends" className="space-y-3 sm:space-y-6">
          <DividendHistoryChart data={dividendHistory} loading={isLoading} />
        </TabsContent>

        <TabsContent value="assets" className="space-y-3 sm:space-y-6">
          <EnhancedAssetTable assets={enhancedAssets} loading={isLoading} />
        </TabsContent>

        <TabsContent value="manual" className="space-y-3 sm:space-y-6">
          <ManualInvestmentTransactions refresh={transactionRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestmentsPage;
