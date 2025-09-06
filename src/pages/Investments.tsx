import { useState, useMemo } from 'react';
import { useFinancialData } from '@/hooks/useFinancialData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InvestmentTransactionForm } from '@/components/InvestmentTransactionForm';


import { DashboardPatrimonio } from '@/components/dashboards/DashboardPatrimonio';
import { DashboardProventos } from '@/components/dashboards/DashboardProventos';
import { DashboardCarteira } from '@/components/dashboards/DashboardCarteira';


const InvestmentsPage = () => {
  const { 
    portfolio, 
    dividends, 
    loading,
    loadFinancialData,
  } = useFinancialData();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFinancialData();
      toast({
        title: 'Dados Atualizados',
        description: 'Sua carteira foi atualizada com sucesso.',
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

  const totalDividendsInMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return dividends
      .filter(div => {
        const divDate = new Date(div.date);
        return divDate.getMonth() === currentMonth && divDate.getFullYear() === currentYear;
      })
      .reduce((sum, div) => sum + div.amount, 0);
  }, [dividends]);

  const isLoading = loading || refreshing;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Carteira de Investimentos</h1>
          <p className="text-muted-foreground">
            Sua carteira de investimentos consolidada.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={isAddTransactionOpen} onOpenChange={setAddTransactionOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Adicionar Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Transação</DialogTitle>
              </DialogHeader>
              <InvestmentTransactionForm onFinished={() => setAddTransactionOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!portfolio && !isLoading && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você ainda não tem nenhuma transação. Adicione uma para começar a ver sua carteira.
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
              Custo total da carteira.
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
                'Valor atual da carteira.'
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
                {totalDividendsInMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total de proventos recebidos no mês.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <DashboardPatrimonio />
        <DashboardProventos />
        <DashboardCarteira />
      </div>

    </div>
  );
};

export default InvestmentsPage;
