import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, User, Calendar as CalendarIcon, ChevronUp, MoreHorizontal, Pencil, Trash2, Loader2, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ErrorBoundary from "./ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Tables, Json, TablesInsert } from "@/integrations/supabase/types";
import { TransactionForm } from "./TransactionForm";

type Transaction = Tables<'transactions'>;

interface FamilyGroup {
  id: string;
  name: string;
}

interface TransactionListProps {
  onDataChange: () => void;
}

interface ImportedRow {
  ID: string;
  'Data/Hora': string;
  Valor: number;
  Categoria: string;
  Descrição?: string;
  Tipo?: 'income' | 'expense';
}


export const TransactionList = ({ onDataChange }: TransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('transactions')
        .select('*');

      if (budgetFilter === 'personal') {
        query = query.is('group_id', null);
      } else if (budgetFilter !== 'all') {
        query = query.eq('group_id', budgetFilter);
      }

      if (dateRange?.from) {
        query = query.gte('date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('date', dateRange.to.toISOString());
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setTransactions(data || []);
    } catch (err: unknown) {
      console.error("Erro ao buscar transações:", err);
      setError("Não foi possível carregar as transações.");
    } finally {
      setLoading(false);
    }
  }, [budgetFilter, dateRange]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_groups')
      if (error) {
        console.error("Erro ao buscar grupos para filtro:", error);
      } else {
        setGroups(data as FamilyGroup[] || []);
      }
    };
    fetchGroups();

    const savedFilters = localStorage.getItem('transactionFilters');
    if (savedFilters) {
      try {
        const { budget, date } = JSON.parse(savedFilters) as { budget: string; date: { from?: string, to?: string }};
        if (budget) setBudgetFilter(budget);
        if (date) setDateRange({
          from: date.from ? new Date(date.from) : undefined,
          to: date.to ? new Date(date.to) : undefined,
        });
      } catch (e) {
        console.error("Failed to parse filters from localStorage", e);
        localStorage.removeItem('transactionFilters');
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      localStorage.setItem('transactionFilters', JSON.stringify({ budget: budgetFilter, date: dateRange }));
    }
  }, [user, budgetFilter, dateRange, fetchTransactions]);

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({
      'ID': t.id,
      'Data/Hora': format(new Date(t.date), "yyyy-MM-dd'T'HH:mm:ss"),
      'Descrição': t.description,
      'Categoria': t.category,
      'Valor': t.amount,
      'Tipo': t.type,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    XLSX.writeFile(workbook, "historico_transacoes.xlsx");
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const importedData: ImportedRow[] = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        let ignoredCount = 0;

        const { data: existingTransactions, error: fetchError } = await supabase
          .from('transactions')
          .select('id, date, amount, category');
        if (fetchError) throw fetchError;

        const existingIdSet = new Set(existingTransactions.map(t => t.id));
        const existingCompositeKeySet = new Set(
          existingTransactions.map(t => `${new Date(t.date).toISOString()}|${t.amount}|${t.category}`)
        );

        const newTransactions: TablesInsert<'transactions'>[] = [];

        for (const row of importedData) {
          if (!row['ID'] || !row['Data/Hora'] || !row['Valor'] || !row['Categoria']) {
            ignoredCount++;
            continue;
          }

          if (existingIdSet.has(row['ID'])) {
            ignoredCount++;
            continue;
          }

          // Additional check for data integrity (optional, but good practice)
          const transactionDate = new Date(row['Data/Hora']);
          const transactionValue = parseFloat(String(row['Valor']));
          if (isNaN(transactionDate.getTime()) || isNaN(transactionValue)) {
            ignoredCount++;
            continue;
          }

          const compositeKey = `${transactionDate.toISOString()}|${transactionValue}|${row['Categoria']}`;
          if (existingCompositeKeySet.has(compositeKey)) {
            ignoredCount++;
            continue;
          }

          newTransactions.push({
            id: row['ID'],
            date: transactionDate.toISOString(),
            description: row['Descrição'] || null,
            category: row['Categoria'],
            amount: transactionValue,
            type: row['Tipo'] === 'income' ? 'income' : 'expense',
          });
        }

        if (newTransactions.length > 0) {
          const { error: insertError } = await supabase.from('transactions').insert(newTransactions.map(t => ({...t, user_id: user?.id })));
          if (insertError) throw insertError;
          importedCount = newTransactions.length;
        }

        toast({
          title: "Importação Concluída",
          description: `${importedCount} registros importados, ${ignoredCount} ignorados.`,
        });
        onDataChange();
        fetchTransactions();

      } catch (err: unknown) {
        console.error("Erro ao importar arquivo:", err);
        toast({
          title: "Erro na Importação",
          description: "Ocorreu um erro ao processar o arquivo. Verifique o formato e tente novamente.",
          variant: "destructive",
        });
      } finally {
        // Reset file input
        if(importFileInputRef.current) {
          importFileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete.id);

      if (error) throw error;

      toast({
        title: "Transação excluída! 🗑️",
        description: "A transação foi removida com sucesso.",
      });

      onDataChange(); // Notifica o componente pai para atualizar os dados
      setTransactionToDelete(null); // Fecha o diálogo
    } catch (err: unknown) {
      console.error("Erro ao excluir transação:", err);
      toast({
        title: "Erro ao excluir transação",
        description: "Não foi possível remover a transação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
          </div>
          <Skeleton className="h-6 w-[80px]" />
        </div>
      ))}
    </div>
  );

  const fallbackUI = (
    <Card>
      <CardHeader>
        <CardTitle>Erro</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar o histórico</AlertTitle>
          <AlertDescription>
            Não foi possível carregar o histórico de transações. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary fallback={fallbackUI}>
      <Card className="bg-gradient-card shadow-card border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Histórico de Transações</CardTitle>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  <ChevronUp className="h-4 w-4 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }} />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
               <div className="flex flex-col gap-4 mb-4">
                {/* Action Buttons */}
                <div className="flex gap-2 justify-start md:justify-end">
                   <input
                    type="file"
                    ref={importFileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                  />
                  <Button variant="outline" size="sm" onClick={handleImportClick}>
                    <Upload className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Importar XLS</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={transactions.length === 0}>
                    <Download className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Exportar XLS</span>
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                    <SelectTrigger className="w-full md:w-[240px]">
                      <SelectValue placeholder="Filtrar por orçamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Orçamentos</SelectItem>
                      <SelectItem value="personal">Pessoal</SelectItem>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className="w-full md:w-auto justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Selecione um período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <ScrollArea className="h-72">
                <div className="space-y-4 pr-4">
                  {loading ? (
                    renderSkeleton()
                  ) : error ? (
                    <div className="text-center py-8 text-destructive flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8" />
                      <p>{error}</p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhuma transação encontrada para os filtros selecionados.</p>
                      <p className="text-sm mt-1">Tente ajustar seus filtros ou adicione uma nova transação.</p>
                    </div>
                  ) : (
                    transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-full p-2 ${
                            transaction.type === 'income'
                              ? 'bg-success-light text-success'
                              : 'bg-expense-light text-expense'
                          }`}>
                            {transaction.type === 'income' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {transaction.description || transaction.category}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {transaction.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(transaction.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.type === 'income' ? 'text-success' : 'text-expense'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setEditingTransaction(transaction)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setTransactionToDelete(transaction)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm
            transactionToEdit={editingTransaction}
            onSave={() => {
              setEditingTransaction(null);
              onDataChange();
            }}
            onCancel={() => setEditingTransaction(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação
              e removerá os dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
};