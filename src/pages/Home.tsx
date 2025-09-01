import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialCard } from "@/components/FinancialCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { ScheduledTasks } from "@/components/ScheduledTasks";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface FinancialData {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { scope } = useBudgetScope();

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
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('month_start_day, carry_over_balance')
        .eq('user_id', user.id)
        .single();

      const monthStartDay = preferences?.month_start_day || 1;
      const carryOverBalance = preferences?.carry_over_balance || false;

      let query = supabase.from('transactions').select('type, amount, date');
      if (scope === 'personal') {
        query = query.is('group_id', null).eq('user_id', user.id);
      } else {
        query = query.eq('group_id', scope);
      }
      const { data: transactions, error } = await query;
      if (error) throw error;

      const now = new Date();
      let monthStartDate = new Date(now.getFullYear(), now.getMonth(), monthStartDay);
      if (now.getDate() < monthStartDay) {
        monthStartDate.setMonth(monthStartDate.getMonth() - 1);
      }
      let monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, monthStartDay - 1);
      monthEndDate.setHours(23, 59, 59, 999);

      let balance = 0;
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      let periodBalance = 0;

      for (const t of transactions) {
        const transactionDate = new Date(t.date);
        const amount = t.type === 'income' ? t.amount : -t.amount;

        balance += amount;

        if (transactionDate >= monthStartDate && transactionDate <= monthEndDate) {
          if (t.type === 'income') {
            monthlyIncome += t.amount;
          } else {
            monthlyExpenses += t.amount;
          }
          periodBalance += amount;
        }
      }

      const finalBalance = carryOverBalance ? balance : periodBalance;

      setFinancialData({ balance: finalBalance, monthlyIncome, monthlyExpenses });
    } catch (err) {
      console.error("Erro ao buscar dados financeiros:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDataRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  if (authLoading || (loadingData && !financialData)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Olá, bem-vindo de volta! 👋
        </h2>
        <p className="text-muted-foreground">
          Aqui está um resumo das suas finanças.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <FinancialCard title="Saldo Atual" value={financialData?.balance ?? 0} type="balance" icon={Wallet} />
        <FinancialCard title="Receitas do Mês" value={financialData?.monthlyIncome ?? 0} type="income" icon={TrendingUp} />
        <FinancialCard title="Gastos do Mês" value={financialData?.monthlyExpenses ?? 0} type="expense" icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <TransactionForm onSave={handleDataRefresh} />
        <TransactionList key={refreshKey} onDataChange={handleDataRefresh} />
      </div>

      <div className="mb-8">
        <ScheduledTasks />
      </div>
    </div>
  );
};

export default Home;
