import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthlyTransactionReport from "@/components/reports/MonthlyTransactionReport";
import MonthlyBalanceReport from "@/components/reports/MonthlyBalanceReport";
import CategoryReport from "@/components/reports/CategoryReport";
import IncomeVsExpenseReport from "@/components/reports/IncomeVsExpenseReport";
import TopExpensesReport from "@/components/reports/TopExpensesReport";

const Reports = () => {
  const reportTabs = [
    { value: 'monthly_transactions', label: 'Transações do Mês', component: <MonthlyTransactionReport /> },
    { value: 'monthly_balance', label: 'Saldo Mensal', component: <MonthlyBalanceReport /> },
    { value: 'by_category', label: 'Por Categoria', component: <CategoryReport /> },
    { value: 'income_vs_expense', label: 'Entradas vs. Saídas', component: <IncomeVsExpenseReport /> },
    { value: 'top_expenses', label: 'Top 3 Despesas', component: <TopExpensesReport /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Analise suas finanças com os relatórios detalhados.
        </p>
      </div>
      <Tabs defaultValue="monthly_transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {reportTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        {reportTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Reports;
