import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialCard } from "@/components/FinancialCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { ScheduledTasks } from "@/components/ScheduledTasks";
import { FamilyGroups } from "@/components/FamilyGroups";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { useAuth } from "@/hooks/useAuth";
import { useOpenBanking } from "@/hooks/useOpenBanking";
import { supabase } from "@/integrations/supabase/client";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  accountTypeMapping,
  mapAccountSubtype,
} from "@/lib/account-mapping";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  CreditCard,
} from "lucide-react";

interface FinancialData {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState<FinancialData | null>(
    null,
  );
  const [loadingData, setLoadingData] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { scope } = useBudgetScope();
  const {
    connected: bankConnected,
    accounts,
    transactions: bankTransactions,
    loading: bankLoading,
  } = useOpenBanking();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, refreshKey, scope]);

  const fetchFinancialData = async () => {
    if (!user) return;

    setLoadingData(true);
    try {
      // 1. Fetch user preferences using raw SQL
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("month_start_day, carry_over_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const monthStartDay = preferences?.month_start_day || 1;
      const carryOverBalance = preferences?.carry_over_balance || false;

      // 2. Fetch transactions
      let query = supabase.from("transactions").select("type, amount, date");
      if (scope === "personal") {
        query = query.is("group_id", null).eq("user_id", user.id);
      } else {
        query = query.eq("group_id", scope);
      }
      const { data: transactions, error } = await query;
      if (error) throw error;

      // 3. Define date range based on preferences
      const now = new Date();
      let monthStartDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        monthStartDay,
      );
      if (now.getDate() < monthStartDay) {
        monthStartDate.setMonth(monthStartDate.getMonth() - 1);
      }
      let monthEndDate = new Date(
        monthStartDate.getFullYear(),
        monthStartDate.getMonth() + 1,
        monthStartDay - 1,
      );
      monthEndDate.setHours(23, 59, 59, 999);

      // 4. Calculate financial data
      let balance = 0;
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      let periodBalance = 0;

      for (const t of transactions) {
        const transactionDate = new Date(t.date);
        const amount = t.type === "income" ? t.amount : -t.amount;

        // Always calculate total balance
        balance += amount;

        // Check if transaction is within the current financial period
        if (
          transactionDate >= monthStartDate &&
          transactionDate <= monthEndDate
        ) {
          if (t.type === "income") {
            monthlyIncome += t.amount;
          } else {
            monthlyExpenses += t.amount;
          }
          periodBalance += amount;
        }
      }

      // 5. Set final balance based on carry_over_balance preference
      const finalBalance = carryOverBalance ? balance : periodBalance;

      setFinancialData({
        balance: finalBalance,
        monthlyIncome,
        monthlyExpenses,
      });
    } catch (err) {
      console.error("Erro ao buscar dados financeiros:", err);
      // Handle error state in UI if necessary
    } finally {
      setLoadingData(false);
    }
  };

  const handleDataRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  if (authLoading || (loadingData && !financialData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Olá, bem-vindo de volta! 👋
          </h2>
          <p className="text-muted-foreground">
            Aqui está um resumo das suas finanças
          </p>
        </div>

        {/* Financial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <FinancialCard
            title="Saldo Atual"
            value={financialData?.balance ?? 0}
            type="balance"
            icon={Wallet}
          />
          <FinancialCard
            title="Receitas do Mês"
            value={financialData?.monthlyIncome ?? 0}
            type="income"
            icon={TrendingUp}
          />
          <FinancialCard
            title="Gastos do Mês"
            value={financialData?.monthlyExpenses ?? 0}
            type="expense"
            icon={TrendingDown}
          />
        </div>

        {/* Banking Overview - Show when connected */}
        {bankConnected && accounts.length > 0 && (
          <div className="mb-8">
            <div className="space-y-6">
              {/* Contas Bancárias Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Contas Bancárias</h3>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter((acc) => acc.type === "BANK")
                    .map((account) => (
                      <div
                        key={account.id}
                        className="p-4 bg-muted/30 rounded-lg snap-center min-w-[80%] md:min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {account.marketingName || account.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {mapAccountSubtype(account.subtype)}
                        </p>
                        <p className="text-lg font-bold">
                          {account.balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: account.currency || "BRL",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Cartões de Crédito Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Cartões de Crédito</h3>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3">
                  {accounts
                    .filter((acc) => acc.type === "CREDIT")
                    .map((account) => (
                      <div
                        key={account.id}
                        className="p-4 bg-muted/30 rounded-lg snap-center min-w-[80%] md:min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {account.marketingName || account.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {account.brand
                            ? `${account.brand} - ${mapAccountSubtype(account.subtype)}`
                            : mapAccountSubtype(account.subtype)}
                        </p>
                        <p className="text-lg font-bold">
                          {account.balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: account.currency || "BRL",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            {bankTransactions.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Últimas Transações Bancárias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {bankTransactions.slice(0, 10).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex justify-between items-center p-2 bg-muted/20 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString(
                              "pt-BR",
                            )}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            transaction.amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.amount >= 0 ? "+" : ""}
                          {transaction.amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Transaction Form */}
          <div>
            <TransactionForm onSave={handleDataRefresh} />
          </div>

          {/* Recent Transactions */}
          <div>
            <TransactionList
              key={refreshKey}
              onDataChange={handleDataRefresh}
            />
          </div>
        </div>

        {/* Family Groups and Scheduled Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <FamilyGroups />
          </div>
          <div>
            <ScheduledTasks />
          </div>
        </div>

        {/* Subscription Status */}
        <div className="mb-8">
          <SubscriptionStatus />
        </div>

        {/* Success Notice */}
        <div className="mt-12 p-6 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-start gap-3">
            <DollarSign className="h-6 w-6 text-success mt-1" />
            <div>
              <h3 className="font-semibold text-success mb-2">
                Sistema de Autenticação e Grupos Ativo! 🎉
              </h3>
              <p className="text-muted-foreground text-sm mb-3">
                Agora você pode criar grupos, compartilhar tarefas agendadas
                entre membros da família e receber notificações por email e
                push. Seus dados estão protegidos e sincronizados com o
                Supabase.
              </p>
              <p className="text-xs text-muted-foreground">
                Use os "Grupos" para compartilhar tarefas com sua família usando
                o código de convite.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
