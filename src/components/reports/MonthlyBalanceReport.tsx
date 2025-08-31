import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { exportToXLS } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface MonthlyBalance {
  month: string;
  balance: number;
}

const MonthlyBalanceReport = () => {
  const [balances, setBalances] = useState<MonthlyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExport = () => {
    const dataToExport = balances.map(b => ({
      Mês: b.month,
      'Saldo Final': b.balance,
    }));

    if (exportToXLS(dataToExport, 'relatorio_saldo_mensal')) {
        toast({ title: "Exportação bem-sucedida!", description: "O arquivo XLS foi gerado." });
    } else {
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo XLS.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount, type')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      const monthlyData: { [month: string]: number } = {};
      let cumulativeBalance = 0;

      for (const tx of data) {
        const date = new Date(tx.date);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = tx.type === 'income' ? tx.amount : -tx.amount;
        cumulativeBalance += amount;
        monthlyData[month] = cumulativeBalance;
      }

      const formattedBalances = Object.entries(monthlyData).map(([month, balance]) => ({
        month,
        balance,
      })).reverse(); // Show most recent first

      setBalances(formattedBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
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
                <CardTitle>Relatório de Saldo Mensal</CardTitle>
                <Button variant="outline" onClick={handleExport} disabled={balances.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar XLS
                </Button>
            </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Saldo Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  Nenhum dado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              balances.map(({ month, balance }) => (
                <TableRow key={month}>
                  <TableCell className="font-medium">{month}</TableCell>
                  <TableCell className={`text-right font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    R$ {balance.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MonthlyBalanceReport;
