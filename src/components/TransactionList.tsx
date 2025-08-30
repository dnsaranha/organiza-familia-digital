import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, User, Calendar as CalendarIcon, ChevronUp, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { TransactionForm } from "./TransactionForm";

type Transaction = Tables<'transactions'>;

interface FamilyGroup {
  id: string;
  name: string;
}

interface TransactionListProps {
  onDataChange: () => void;
}

export const TransactionList = ({ onDataChange }: TransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any).rpc('get_user_groups');
      if (error) {
        console.error("Erro ao buscar grupos para filtro:", error);
      } else {
        setGroups((data as FamilyGroup[]) || []);
      }
    };
    fetchGroups();

    const savedFilters = localStorage.getItem('transactionFilters');
    if (savedFilters) {
      try {
        const { budget, date } = JSON.parse(savedFilters);
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
  }, [user, budgetFilter, dateRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = (supabase as any)
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

      setTransactions((data as unknown as Transaction[]) || []);
    } catch (err: any) {
      console.error("Erro ao buscar transações:", err);
      setError("Não foi possível carregar as transações.");
    } finally {
      setLoading(false);
    }
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
      const { error } = await (supabase as any)
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
    } catch (err: any) {
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

  return (
    <>
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
              <div className="flex flex-col md:flex-row gap-2 mb-4">
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
    </>
  );
};