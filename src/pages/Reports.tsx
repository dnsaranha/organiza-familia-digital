import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const ExpensePieChart = lazy(() => import('@/components/charts/ExpensePieChart'));
const IncomeExpenseBarChart = lazy(() => import('@/components/charts/IncomeExpenseBarChart'));

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
}

const ReportsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id, type, category, amount, date');

        if (error) throw error;
        setTransactions(data as Transaction[] || []);
      } catch (err) {
        console.error("Erro ao buscar transações:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const categories = useMemo(() => {
    const allCategories = transactions.map(t => t.category).filter(Boolean);
    return ['all', ...Array.from(new Set(allCategories))];
  }, [transactions]);

  useEffect(() => {
    let filtered = transactions;

    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!;
      });
    }

    if (category !== "all") {
      filtered = filtered.filter(t => t.category === category);
    }

    setFilteredTransactions(filtered);
  }, [transactions, dateRange, category]);

  const expenseByCategory = useMemo(() => {
    const expenseData = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const category = transaction.category || 'Sem Categoria';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expenseData).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const incomeVsExpenseData = useMemo(() => {
    const monthlyData = filteredTransactions.reduce((acc, t) => {
      const month = format(new Date(t.date), 'MMM/yy', { locale: ptBR });
      if (!acc[month]) {
        acc[month] = { name: month, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        acc[month].income += t.amount;
      } else {
        acc[month].expense += t.amount;
      }
      return acc;
    }, {} as Record<string, { name: string; income: number; expense: number }>);

    return Object.values(monthlyData);
  }, [filteredTransactions]);

  const ChartLoader = () => (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Avançados</h1>
          <p className="text-muted-foreground">
            Analise suas finanças com gráficos detalhados e filtros interativos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">Exportar PDF</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-8">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-1 block">Período</label>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-1 block">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>
                    {c === 'all' ? 'Todas' : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-1 block">Membro</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button>Aplicar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <Suspense fallback={<ChartLoader />}>
              <ExpensePieChart data={expenseByCategory} />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs. Despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <Suspense fallback={<ChartLoader />}>
              <IncomeExpenseBarChart data={incomeVsExpenseData} />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => {
                      const date = t.date ? new Date(t.date) : null;
                      const isValidDate = date && !isNaN(date.getTime());

                      return (
                        <TableRow key={t.id}>
                          <TableCell>{isValidDate ? date.toLocaleDateString('pt-BR') : 'Data inválida'}</TableCell>
                          <TableCell>{t.category || 'N/A'}</TableCell>
                          <TableCell className={cn('text-right font-medium', t.type === 'income' ? 'text-green-500' : 'text-red-500')}>
                            {t.type === 'income' ? '+' : '-'} {typeof t.amount === 'number' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
