import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { exportToXLS } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

interface GroupedTransactions {
  [date: string]: Transaction[];
}

const MonthlyTransactionReport = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExport = () => {
    const dataToExport = transactions.map(tx => ({
      Data: new Date(tx.date).toLocaleDateString('pt-BR'),
      Descrição: tx.description,
      Categoria: tx.category,
      Tipo: tx.type === 'income' ? 'Receita' : 'Despesa',
      Valor: tx.amount,
    }));

    if (exportToXLS(dataToExport, 'relatorio_transacoes_mensais')) {
        toast({ title: "Exportação bem-sucedida!", description: "O arquivo XLS foi gerado." });
    } else {
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo XLS.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, date, description, amount, type, category')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedTransactions = transactions.reduce((acc, tx) => {
    const date = new Date(tx.date).toLocaleDateString('pt-BR');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(tx);
    return acc;
  }, {} as GroupedTransactions);

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Relatório Mensal de Transações</CardTitle>
                <Button variant="outline" onClick={handleExport} disabled={transactions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar XLS
                </Button>
            </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(groupedTransactions).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhuma transação encontrada para este mês.
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedTransactions).map(([date, txs]) => ([
                  <TableRow key={date} className="bg-muted/50">
                    <TableCell colSpan={4} className="font-semibold">{date}</TableCell>
                  </TableRow>,
                  txs.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell></TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.category}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
              ]))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MonthlyTransactionReport;
