import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { exportToXLS } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface IncomeVsExpense {
  income: number;
  expense: number;
  net: number;
}

const IncomeVsExpenseReport = () => {
  const [summary, setSummary] = useState<IncomeVsExpense>({ income: 0, expense: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExport = () => {
    const dataToExport = [
        { Rubrica: 'Total de Receitas', Valor: summary.income },
        { Rubrica: 'Total de Despesas', Valor: summary.expense },
        { Rubrica: 'Saldo Líquido', Valor: summary.net },
    ];

    if (exportToXLS(dataToExport, 'relatorio_entradas_saidas')) {
        toast({ title: "Exportação bem-sucedida!", description: "O arquivo XLS foi gerado." });
    } else {
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo XLS.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user]);

  const fetchSummary = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      let income = 0;
      let expense = 0;

      for (const tx of data) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else {
          expense += tx.amount;
        }
      }

      setSummary({ income, expense, net: income - expense });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Resumo de Entradas vs. Saídas</CardTitle>
            <Button variant="outline" onClick={handleExport} disabled={summary.income === 0 && summary.expense === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar XLS
            </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {summary.income.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              R$ {summary.expense.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <MinusCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.net >= 0 ? 'text-success' : 'text-destructive'}`}>
              R$ {summary.net.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default IncomeVsExpenseReport;
