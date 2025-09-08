import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Loader2,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOpenBanking } from "@/hooks/useOpenBanking";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { DateRange } from "react-day-picker";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import {
  accountTypeMapping,
  mapAccountSubtype,
} from "@/lib/account-mapping";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";

const ExpensePieChart = lazy(
  () => import("@/components/charts/ExpensePieChart"),
);
const IncomeExpenseBarChart = lazy(
  () => import("@/components/charts/IncomeExpenseBarChart"),
);

interface Transaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  group_id: string | null;
  memberName?: string;
}

interface GroupMember {
  id: string;
  full_name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const ReportsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { scope } = useBudgetScope();
  const navigate = useNavigate();
  const {
    connected: bankConnected,
    accounts,
    transactions: bankTransactions,
    loading: bankLoading,
  } = useOpenBanking();

  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [category, setCategory] = useState<string>("all");
  const [member, setMember] = useState<string>("all");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [filteredBankTransactions, setFilteredBankTransactions] = useState<
    any[]
  >([]);

  const handleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) => {
      if (prev.includes(accountId)) {
        return prev.filter((id) => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handlePdfExport = async () => {
    const pieChartElement = pieChartRef.current;
    const barChartElement = barChartRef.current;

    if (!pieChartElement || !barChartElement) return;

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.text("Relatório Financeiro", 14, 15);

    try {
      const pieCanvas = await html2canvas(pieChartElement);
      const barCanvas = await html2canvas(barChartElement);
      const pieImageData = pieCanvas.toDataURL("image/png");
      const barImageData = barCanvas.toDataURL("image/png");

      pdf.text("Despesas por Categoria", 14, 25);
      pdf.addImage(pieImageData, "PNG", 14, 30, 80, 60);

      pdf.text("Receitas vs. Despesas", 105, 25);
      pdf.addImage(barImageData, "PNG", 105, 30, 80, 60);

      const tableData = filteredTransactions.map((t) => [
        t.date
          ? new Date(t.date.replace(/-/g, "/")).toLocaleDateString("pt-BR")
          : "N/A",
        t.category,
        t.memberName || (scope === "personal" ? user?.email : "N/A"),
        t.type === "income" ? "Receita" : "Despesa",
        new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(t.amount),
      ]);

      const head = [["Data", "Categoria", "Membro", "Tipo", "Valor"]];
      if (scope === "personal") {
        head[0].splice(2, 1);
        tableData.forEach((row) => row.splice(2, 1));
      }

      autoTable(pdf, {
        head: head,
        body: tableData,
        startY: 100,
        headStyles: { fillColor: [22, 163, 74] },
      });

      pdf.save("Relatorio_Financeiro.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  const handleExcelExport = () => {
    const dataToExport = filteredTransactions.map((t) => ({
      Data: t.date
        ? new Date(t.date.replace(/-/g, "/")).toLocaleDateString("pt-BR")
        : "N/A",
      Categoria: t.category,
      Membro: t.memberName,
      Tipo: t.type === "income" ? "Receita" : "Despesa",
      Valor: t.amount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    XLSX.writeFile(workbook, "Relatorio_Transacoes.xlsx");
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let query = supabase.from("transactions").select("*");

        if (scope === "personal") {
          query = query.is("group_id", null).eq("user_id", user.id);
        } else {
          query = query.eq("group_id", scope);
        }

        const { data, error } = await query;
        if (error) throw error;
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
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name");
        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };
    fetchProfiles();
  }, []);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      setMember("all");
      if (scope === "personal" || !scope) {
        setGroupMembers([]);
        return;
      }
      try {
        const { data, error } = await (supabase as any).rpc(
          "get_group_members",
          { p_group_id: scope },
        );
        if (error) throw error;
        setGroupMembers((data as GroupMember[]) || []);
      } catch (err) {
        console.error("Caught error in fetchGroupMembers:", err);
      }
    };
    fetchGroupMembers();
  }, [scope]);

  // Load bank transactions when accounts are available
  // Filter bank transactions based on selections
  useEffect(() => {
    let filtered = bankTransactions;

    // Filter by selected accounts
    if (selectedAccountIds.length > 0) {
      filtered = filtered.filter((t) =>
        selectedAccountIds.includes(t.accountId),
      );
    }

    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate >= dateRange.from! && transactionDate <= dateRange.to!
        );
      });
    }

    // Filter by category
    if (category !== "all") {
      filtered = filtered.filter((t) => t.category === category);
    }

    // Fix credit card transactions showing as positive - expenses should be negative
    const correctedAmounts = filtered.map((t) => ({
      ...t,
      amount:
        t.amount > 0 &&
        accounts.find((a) => a.id === t.accountId)?.type === "CREDIT"
          ? -Math.abs(t.amount)
          : t.amount,
    }));

    setFilteredBankTransactions(correctedAmounts);
  }, [bankTransactions, selectedAccountIds, dateRange, category, accounts]);

  const categories = useMemo(() => {
    const manualCategories = transactions
      .map((t) => t.category)
      .filter(Boolean);
    const bankCategories = bankTransactions
      .map((t) => t.category)
      .filter(Boolean);
    const allCategories = [...manualCategories, ...bankCategories];
    return ["all", ...Array.from(new Set(allCategories))];
  }, [transactions, bankTransactions]);

  useEffect(() => {
    let filtered = transactions;

    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter((t) => {
        if (!t.date) return false;
        const transactionDate = new Date(t.date.replace(/-/g, "/"));
        return (
          transactionDate >= dateRange.from! && transactionDate <= dateRange.to!
        );
      });
    }

    if (category !== "all") {
      filtered = filtered.filter((t) => t.category === category);
    }

    if (member !== "all") {
      filtered = filtered.filter((t) => t.user_id === member);
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
    const augmentedTransactions = filtered.map((t) => ({
      ...t,
      memberName: profileMap.get(t.user_id) || "Usuário desconhecido",
    }));

    setFilteredTransactions(augmentedTransactions);
  }, [transactions, profiles, dateRange, category, member]);

  const expenseByCategory = useMemo(() => {
    const expenseData = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, transaction) => {
          const category = transaction.category || "Sem Categoria";
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += transaction.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

    return Object.entries(expenseData).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredTransactions]);

  // Bank expense by category for charts
  const bankExpenseByCategory = useMemo(() => {
    const expenseData = filteredBankTransactions
      .filter((t) => t.amount < 0)
      .reduce(
        (acc, transaction) => {
          const category = transaction.category || "Sem Categoria";
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += Math.abs(transaction.amount);
          return acc;
        },
        {} as Record<string, number>,
      );

    return Object.entries(expenseData).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredBankTransactions]);

  // Bank income vs expense data for charts
  const bankIncomeVsExpenseData = useMemo(() => {
    const monthlyData = filteredBankTransactions.reduce(
      (acc, t) => {
        const month = format(new Date(t.date), "MMM/yy", {
          locale: ptBR,
        });
        if (!acc[month]) {
          acc[month] = { name: month, income: 0, expense: 0 };
        }
        if (t.amount > 0) {
          acc[month].income += t.amount;
        } else {
          acc[month].expense += Math.abs(t.amount);
        }
        return acc;
      },
      {} as Record<string, { name: string; income: number; expense: number }>,
    );

    return Object.values(monthlyData);
  }, [filteredBankTransactions]);

  const incomeVsExpenseData = useMemo(() => {
    const monthlyData = filteredTransactions.reduce(
      (acc, t) => {
        if (!t.date) return acc;
        const month = format(new Date(t.date.replace(/-/g, "/")), "MMM/yy", {
          locale: ptBR,
        });
        if (!acc[month]) {
          acc[month] = { name: month, income: 0, expense: 0 };
        }
        if (t.type === "income") {
          acc[month].income += t.amount;
        } else {
          acc[month].expense += t.amount;
        }
        return acc;
      },
      {} as Record<string, { name: string; income: number; expense: number }>,
    );

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
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "Todas" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-1 block">Membro</label>
            <Select
              value={member}
              onValueChange={setMember}
              disabled={scope === "personal"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {groupMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Banking Overview - Show when connected */}
      {bankConnected && accounts.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Resumo Bancário</CardTitle>
              </div>
              <Badge variant="default">
                {accounts.length} conta(s) conectada(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Saldo Selecionado</span>
                </div>
                <p className="text-2xl font-bold">
                  {(selectedAccountIds.length > 0
                    ? accounts
                        .filter((acc) => selectedAccountIds.includes(acc.id))
                        .reduce((sum, acc) => sum + acc.balance, 0)
                    : accounts.reduce((sum, acc) => sum + acc.balance, 0)
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    Entradas (Período)
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredBankTransactions
                    .filter((t) => t.amount > 0)
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Saídas (Período)</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {Math.abs(
                    filteredBankTransactions
                      .filter((t) => t.amount < 0)
                      .reduce((sum, t) => sum + t.amount, 0),
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Tabs */}
      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Transações Manuais</TabsTrigger>
          <TabsTrigger value="banking" disabled={!bankConnected}>
            Dados Bancários {!bankConnected && "(Não Conectado)"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-8">
          {/* Manual Transactions Reports */}
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações Manuais</CardTitle>
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
                        {scope !== "personal" && <TableHead>Membro</TableHead>}
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t) => {
                        const date = t.date
                          ? new Date(t.date.replace(/-/g, "/"))
                          : null;
                        const isValidDate = date && !isNaN(date.getTime());

                        return (
                          <TableRow key={t.id}>
                            <TableCell>
                              {isValidDate
                                ? date.toLocaleDateString("pt-BR")
                                : "Data inválida"}
                            </TableCell>
                            <TableCell>{t.category || "N/A"}</TableCell>
                            {scope !== "personal" && (
                              <TableCell>{t.memberName || "N/A"}</TableCell>
                            )}
                            <TableCell
                              className={cn(
                                "text-right font-medium",
                                t.type === "income"
                                  ? "text-green-500"
                                  : "text-red-500",
                              )}
                            >
                              {t.type === "income" ? "+" : "-"}{" "}
                              {typeof t.amount === "number"
                                ? new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(t.amount)
                                : "N/A"}
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
        </TabsContent>

        <TabsContent value="banking" className="space-y-8">
          {/* Banking Transactions Reports */}
          {bankConnected ? (
            <>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Contas Bancárias</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts
                      .filter((acc) => acc.type === "BANK")
                      .map((account) => (
                        <Card
                          key={account.id}
                          onClick={() => handleAccountSelection(account.id)}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-lg",
                            selectedAccountIds.includes(account.id)
                              ? "ring-2 ring-primary ring-offset-2"
                              : "ring-0",
                            selectedAccountIds.length > 0 &&
                              !selectedAccountIds.includes(account.id)
                              ? "opacity-50"
                              : "opacity-100",
                          )}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {account.marketingName || account.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {accountTypeMapping[account.type] ||
                                account.type}{" "}
                              • {mapAccountSubtype(account.subtype)}
                            </p>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {account.balance.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: account.currency || "BRL",
                              })}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Cartões de Crédito</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts
                      .filter((acc) => acc.type === "CREDIT")
                      .map((account) => (
                        <Card
                          key={account.id}
                          onClick={() => handleAccountSelection(account.id)}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-lg",
                            selectedAccountIds.includes(account.id)
                              ? "ring-2 ring-primary ring-offset-2"
                              : "ring-0",
                            selectedAccountIds.length > 0 &&
                              !selectedAccountIds.includes(account.id)
                              ? "opacity-50"
                              : "opacity-100",
                          )}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {account.marketingName || account.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {accountTypeMapping[account.type] ||
                                account.type}{" "}
                              • {mapAccountSubtype(account.subtype)}
                            </p>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {account.balance.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: account.currency || "BRL",
                              })}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>

              {/* Bank Data Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Despesas Bancárias por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <Suspense fallback={<ChartLoader />}>
                      <ExpensePieChart data={bankExpenseByCategory} />
                    </Suspense>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Receitas vs. Despesas Bancárias</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <Suspense fallback={<ChartLoader />}>
                      <IncomeExpenseBarChart data={bankIncomeVsExpenseData} />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Transações Bancárias</CardTitle>
                </CardHeader>
                <CardContent>
                  {bankLoading ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
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
                          {filteredBankTransactions.length > 0 ? (
                            filteredBankTransactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  {new Date(
                                    transaction.date,
                                  ).toLocaleDateString("pt-BR")}
                                </TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {transaction.category}
                                  </Badge>
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-medium",
                                    transaction.amount >= 0
                                      ? "text-green-500"
                                      : "text-red-500",
                                  )}
                                >
                                  {transaction.amount >= 0 ? "+" : ""}
                                  {transaction.amount.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-8"
                              >
                                Nenhuma transação encontrada para os filtros
                                selecionados.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[300px] text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma Conta Conectada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Conecte suas contas bancárias para ver relatórios detalhados.
                </p>
                <Button onClick={() => navigate("/connect")}>
                  Conectar Contas
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
