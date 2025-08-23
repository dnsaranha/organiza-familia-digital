import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { FinancialCard } from "@/components/FinancialCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { ScheduledTasks } from "@/components/ScheduledTasks";
import { FamilyGroups } from "@/components/FamilyGroups";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Mock data - será substituído pela integração com Supabase
  const financialData = {
    balance: 2548.70,
    monthlyIncome: 3500.00,
    monthlyExpenses: 951.30
  };

  if (loading) {
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
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Olá, bem-vindo de volta! 👋
          </h2>
          <p className="text-muted-foreground">
            Aqui está um resumo das suas finanças familiares
          </p>
        </div>

        {/* Financial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <FinancialCard
            title="Saldo Atual"
            value={financialData.balance}
            type="balance"
            icon={Wallet}
          />
          <FinancialCard
            title="Receitas do Mês"
            value={financialData.monthlyIncome}
            type="income"
            icon={TrendingUp}
          />
          <FinancialCard
            title="Gastos do Mês"
            value={financialData.monthlyExpenses}
            type="expense"
            icon={TrendingDown}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Transaction Form */}
          <div>
            <TransactionForm />
          </div>
          
          {/* Recent Transactions */}
          <div>
            <TransactionList />
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

        {/* Success Notice */}
        <div className="mt-12 p-6 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-start gap-3">
            <DollarSign className="h-6 w-6 text-success mt-1" />
            <div>
              <h3 className="font-semibold text-success mb-2">
                Sistema de Autenticação e Grupos Familiares Ativo! 🎉
              </h3>
              <p className="text-muted-foreground text-sm mb-3">
                Agora você pode criar grupos familiares, compartilhar tarefas agendadas entre membros da família 
                e receber notificações por email e push. Seus dados estão protegidos e sincronizados com o Supabase.
              </p>
              <p className="text-xs text-muted-foreground">
                Use os "Grupos Familiares" para compartilhar tarefas com sua família usando o código de convite.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
