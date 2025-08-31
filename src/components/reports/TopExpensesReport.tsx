import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Download, Loader2, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { exportToXLS } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface TopExpense {
  category: string;
  total: number;
}

const TopExpensesReport = () => {
  const [topExpenses, setTopExpenses] = useState<TopExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExport = () => {
    const dataToExport = topExpenses.map((e, index) => ({
      Ranking: index + 1,
      Categoria: e.category,
      Total: e.total,
    }));

    if (exportToXLS(dataToExport, 'relatorio_top_despesas')) {
        toast({ title: "Exportação bem-sucedida!", description: "O arquivo XLS foi gerado." });
    } else {
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo XLS.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      fetchTopExpenses();
    }
  }, [user]);

  const fetchTopExpenses = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const totals: { [category: string]: number } = {};

      for (const tx of data) {
        const category = tx.category || 'Sem Categoria';
        if (!totals[category]) {
          totals[category] = 0;
        }
        totals[category] += tx.amount;
      }

      const sortedExpenses = Object.entries(totals)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      setTopExpenses(sortedExpenses);
    } catch (error) {
      console.error('Error fetching top expenses:', error);
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
            <CardTitle>Top 3 Categorias de Despesa</CardTitle>
            <Button variant="outline" onClick={handleExport} disabled={topExpenses.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar XLS
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {topExpenses.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhuma despesa encontrada para este mês.
          </div>
        ) : (
          <ul className="space-y-4">
            {topExpenses.map((expense, index) => (
              <li key={expense.category} className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mr-4">
                  <span className="text-lg font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{expense.category}</p>
                  <p className="text-destructive text-sm font-semibold">
                    R$ {expense.total.toFixed(2)}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-destructive" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TopExpensesReport;
