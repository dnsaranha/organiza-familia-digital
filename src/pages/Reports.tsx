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
import { useRef } from "react";
import { DateRange } from "react-day-picker";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

const ExpensePieChart = lazy(() => import('@/components/charts/ExpensePieChart'));
const IncomeExpenseBarChart = lazy(() => import('@/components/charts/IncomeExpenseBarChart'));

interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  group_id: string | null;
  memberName?: string;
}

interface GroupMember {
  user_id: string;
  full_name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const ReportsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { scope } = useBudgetScope();

  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [category, setCategory] = useState<string>("all");
  const [member, setMember] = useState<string>("all");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const handlePdfExport = async () => {
    const pieChartElement = pieChartRef.current;
    const barChartElement = barChartRef.current;

    if (!pieChartElement || !barChartElement) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.text("Relatório Financeiro", 14, 15);

    try {
      const pieCanvas = await html2canvas(pieChartElement);
      const barCanvas = await html2canvas(barChartElement);
      const pieImageData = pieCanvas.toDataURL('image/png');
      const barImageData = barCanvas.toDataURL('image/png');

      pdf.text("Despesas por Categoria", 14, 25);
      pdf.addImage(pieImageData, 'PNG', 14, 30, 80, 60);

      pdf.text("Receitas vs. Despesas", 105, 25);
      pdf.addImage(barImageData, 'PNG', 105, 30, 80, 60);

      const tableData = filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.category,
        t.memberName || (scope === 'personal' ? user?.email : 'N/A'),
        t.type === 'income' ? 'Receita' : 'Despesa',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)
      ]);

      const head = [['Data', 'Categoria', 'Membro', 'Tipo', 'Valor']];
      if (scope === 'personal') {
        head[0].splice(2, 1);
        tableData.forEach(row => row.splice(2, 1));
      }

      autoTable(pdf, {
        head: head,
        body: tableData,
        startY: 100,
        headStyles: { fillColor: [22, 163, 74] },
      });

      pdf.save('Relatorio_Financeiro.pdf');

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  const handleExcelExport = () => {
    const dataToExport = filteredTransactions.map(t => ({
      'Data': new Date(t.date).toLocaleDateString('pt-BR'),
      'Categoria': t.category,
      'Membro': t.memberName,
      'Tipo': t.type === 'income' ? 'Receita' : 'Despesa',
      'Valor': t.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
    XLSX.writeFile(workbook, 'Relatorio_Transacoes.xlsx');
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let query = supabase.from('transactions').select('*');

        if (scope === 'personal') {
          query = query.is('group_id', null).eq('user_id', user.id);
        } else {
          query = query.eq('group_id', scope);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Supabase error fetching transactions:", error);
          throw error;
        }

        setTransactions(data || []);
      } catch (err) {
        console.error("Caught error in fetchTransactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, scope]);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id, full_name');
        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (scope === 'personal' || !scope) {
        setGroupMembers([]);
        setMember("all");
        return;
      }
      try {
        const { data, error } = await (supabase as any).rpc('get_group_members', { p_group_id: scope });

        if (error) {
          console.error("Supabase error fetching group members:", error);
          throw error;
        }

        setGroupMembers(data as GroupMember[] || []);
      } catch (err) {
        console.error("Caught error in fetchGroupMembers:", err);
      }
    };
    fetchGroupMembers();
  }, [scope]);

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

    if (member !== "all") {
      filtered = filtered.filter(t => t.user_id === member);
    }

    const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));
    const augmentedTransactions = filtered.map(t => ({
      ...t,
      memberName: profileMap.get(t.user_id) || 'Usuário desconhecido'
    }));

    setFilteredTransactions(augmentedTransactions);
  }, [transactions, profiles, dateRange, category, member]);

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
          <Button variant="outline" size="sm" onClick={handlePdfExport}>
            <Download className="md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">Exportar PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelExport}>
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
            <Select value={member} onValueChange={setMember} disabled={scope === 'personal'}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {groupMembers.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card ref={pieChartRef}>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <Suspense fallback={<ChartLoader />}>
              <ExpensePieChart data={expenseByCategory} />
            </Suspense>
          </CardContent>
        </Card>
        <Card ref={barChartRef}>
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
                      {scope !== 'personal' && <TableHead>Membro</TableHead>}
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
                          {scope !== 'personal' && <TableCell>{t.memberName || 'N/A'}</TableCell>}
                          <TableCell className={cn('text-right font-medium', t.type === 'income' ? 'text-success-foreground' : 'text-destructive-foreground')}>
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
