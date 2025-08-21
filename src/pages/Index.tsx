import { Header } from "@/components/Header";
import { FinancialCard } from "@/components/FinancialCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const Index = () => {
  // Mock data - será substituído pela integração com Supabase
  const financialData = {
    balance: 2548.70,
    monthlyIncome: 3500.00,
    monthlyExpenses: 951.30
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transaction Form */}
          <div>
            <TransactionForm />
          </div>
          
          {/* Recent Transactions */}
          <div>
            <TransactionList />
          </div>
        </div>

        {/* Supabase Integration Notice */}
        <div className="mt-12 p-6 bg-primary-light/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <DollarSign className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-primary mb-2">
                Conecte ao Supabase para funcionalidades completas
              </h3>
              <p className="text-muted-foreground text-sm mb-3">
                Para usar login, grupos familiares, sincronização de dados e todas as funcionalidades avançadas, 
                conecte seu projeto ao Supabase clicando no botão verde no canto superior direito.
              </p>
              <p className="text-xs text-muted-foreground">
                Os dados mostrados acima são apenas exemplos para demonstração da interface.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
