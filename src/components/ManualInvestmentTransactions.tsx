import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Transaction {
  id: string;
  ticker: string;
  asset_name: string;
  transaction_type: "buy" | "sell";
  quantity: number;
  price: number;
  transaction_date: string;
  fees: number;
  notes: string | null;
}

interface ManualInvestmentTransactionsProps {
  refresh?: number;
}

export function ManualInvestmentTransactions({ refresh }: ManualInvestmentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta transação?")) return;

    try {
      const { error } = await supabase
        .from("investment_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });

      loadTransactions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPositionSummary = () => {
    const positions = transactions.reduce((acc, t) => {
      if (!acc[t.ticker]) {
        acc[t.ticker] = { 
          ticker: t.ticker, 
          asset_name: t.asset_name, 
          quantity: 0, 
          totalCost: 0 
        };
      }
      
      if (t.transaction_type === "buy") {
        acc[t.ticker].quantity += t.quantity;
        acc[t.ticker].totalCost += (t.quantity * t.price) + t.fees;
      } else {
        acc[t.ticker].quantity -= t.quantity;
        acc[t.ticker].totalCost -= (t.quantity * t.price) - t.fees;
      }
      
      return acc;
    }, {} as Record<string, { ticker: string; asset_name: string; quantity: number; totalCost: number }>);

    return Object.values(positions).filter(p => p.quantity > 0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const positionSummary = getPositionSummary();

  return (
    <div className="space-y-4">
      {/* Posições Atuais */}
      {positionSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Posições Atuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Ticker</TableHead>
                    <TableHead className="text-xs sm:text-sm">Ativo</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Quantidade</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Custo Total</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Preço Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionSummary.map((position) => (
                    <TableRow key={position.ticker}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {position.ticker}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{position.asset_name}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {position.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {position.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {(position.totalCost / position.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transação registrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm min-w-[80px]">Data</TableHead>
                    <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[80px]">Ticker</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Qtd</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Preço</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Total</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Taxas</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-xs sm:text-sm">
                        {format(new Date(transaction.transaction_date), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {transaction.transaction_type === "buy" ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className="text-xs sm:text-sm">
                            {transaction.transaction_type === "buy" ? "Compra" : "Venda"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {transaction.ticker}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {transaction.quantity}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {transaction.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {(transaction.quantity * transaction.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        R$ {transaction.fees.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}