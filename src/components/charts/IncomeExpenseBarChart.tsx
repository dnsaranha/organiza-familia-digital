import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: { name: string; income: number; expense: number }[];
}

const IncomeExpenseBarChart = ({ data }: BarChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Nenhum dado para exibir.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `R$${value / 1000}k`} />
        <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" name="Receita" />
        <Bar dataKey="expense" fill="#ef4444" name="Despesa" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseBarChart;
