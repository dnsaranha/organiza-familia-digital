import AllocationChart from '@/components/charts/AllocationChart';
import ProfitabilityChart from '@/components/charts/ProfitabilityChart';
import InvestmentTable from '@/components/InvestmentTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  investmentSummary,
  assetAllocation,
  monthlyProfitability,
  investmentAssets,
} from '@/lib/mock-data';
import { DollarSign, TrendingUp, Wallet, Banknote } from 'lucide-react';
import { useEffect } from 'react';
import yahooFinance from 'yahoo-finance-api';
import { toast } from 'sonner';

const Investments = () => {
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // We can keep the API call example, but we won't use the result for now
        const quote = await yahooFinance.getQuote('PETR4.SA');
        // In a real scenario, we would update the state with this data
      } catch (error) {
        console.error('Failed to fetch stock price:', error);
      }
    };

    fetchPrices();
  }, []);

  const handleSimulatedConnection = () => {
    toast.success('Conexão simulada com sucesso!', {
      description: 'Seus dados seriam sincronizados agora.',
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Minha Carteira</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              Conectar sua corretora/banco
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Simulação de Open Finance</DialogTitle>
              <DialogDescription>
                Esta é uma demonstração. Em um aplicativo real, você seria
                redirecionado para o ambiente seguro do seu banco.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-muted-foreground">
                Selecione seu banco para continuar:
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                  <Button variant="outline">Banco A</Button>
                  <Button variant="outline">Banco B</Button>
                  <Button variant="outline">Corretora C</Button>
              </div>
            </div>
            <Button onClick={handleSimulatedConnection} className="w-full">
              Simular Conexão
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investido
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {investmentSummary.totalInvested.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rentabilidade Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{investmentSummary.monthlyProfitability}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dividendos Recebidos (Mês)
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {investmentSummary.dividendsReceived.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alocação por Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart data={assetAllocation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rentabilidade Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitabilityChart data={monthlyProfitability} />
          </CardContent>
        </Card>
      </div>

      {/* Investment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <InvestmentTable assets={investmentAssets} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Investments;
