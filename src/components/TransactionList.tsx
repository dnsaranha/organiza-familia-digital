import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
}

// Mock data - será substituído pela integração com Supabase
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    amount: -85.50,
    category: 'Alimentação',
    description: 'Supermercado',
    date: '2024-01-20'
  },
  {
    id: '2',
    type: 'income',
    amount: 3500.00,
    category: 'Salário',
    description: 'Salário Janeiro',
    date: '2024-01-15'
  },
  {
    id: '3',
    type: 'expense',
    amount: -120.00,
    category: 'Transporte',
    description: 'Combustível',
    date: '2024-01-18'
  },
  {
    id: '4',
    type: 'expense',
    amount: -45.80,
    category: 'Lazer',
    description: 'Cinema',
    date: '2024-01-17'
  }
];

export const TransactionList = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Transações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTransactions.map((transaction) => (
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
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'income' ? 'text-success' : 'text-expense'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {mockTransactions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Adicione sua primeira transação para começar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};