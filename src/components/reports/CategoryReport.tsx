import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { exportToXLS } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface CategoryTotal {
  category: string;
  total: number;
  type: 'income' | 'expense';
}

const CategoryReport = () => {
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExport = () => {
    const dataToExport = categoryTotals.map(c => ({
      Categoria: c.category,
      Tipo: c.type === 'income' ? 'Receita' : 'Despesa',
      Total: c.total,
    }));

    if (exportToXLS(dataToExport, 'relatorio_por_categoria')) {
        toast({ title: "Exportação bem-sucedida!", description: "O arquivo XLS foi gerado." });
    } else {
        toast({ title: "Erro na Exportação", description: "Não foi possível gerar o arquivo XLS.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategoryTotals();
    }
  }, [user]);

  const fetchCategoryTotals = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('category, amount, type')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const totals: { [key: string]: { total: number; type: 'income' | 'expense' } } = {};

      for (const tx of data) {
        const key = `${tx.category}-${tx.type}`;
        if (!totals[key]) {
          totals[key] = { total: 0, type: tx.type };
        }
        totals[key].total += tx.amount;
      }

      const formattedTotals = Object.entries(totals).map(([key, value]) => {
        const [category] = key.split(`-${value.type}`);
        return {
          category,
          ...value,
        };
      }).sort((a, b) => b.total - a.total);

      setCategoryTotals(formattedTotals);
    } catch (error) {
      console.error('Error fetching category totals:', error);
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
            <CardTitle>Relatório Mensal por Categoria</CardTitle>
            <Button variant="outline" onClick={handleExport} disabled={categoryTotals.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar XLS
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryTotals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Nenhuma transação encontrada para este mês.
                </TableCell>
              </TableRow>
            ) : (
              categoryTotals.map(({ category, total, type }) => (
                <TableRow key={`${category}-${type}`}>
                  <TableCell className="font-medium">{category || 'Sem Categoria'}</TableCell>
                  <TableCell className="capitalize">{type === 'income' ? 'Receita' : 'Despesa'}</TableCell>
                  <TableCell className={`text-right font-bold ${type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    R$ {total.toFixed(2)}
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

export default CategoryReport;
