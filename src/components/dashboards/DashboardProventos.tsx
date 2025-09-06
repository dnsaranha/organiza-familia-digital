import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '@/hooks/useFinancialData';
import { format, subMonths, subYears, startOfDay, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';

type Period = '6m' | '12m' | '5y' | 'all';

interface ProventosChartDataPoint {
  date: string;
  compras: number;
  vendas: number;
  custos: number;
  proventos: number;
}

export const DashboardProventos = () => {
    const { transactions, dividends, loading } = useFinancialData();
    const [period, setPeriod] = useState<Period>('12m');

    const chartData = useMemo(() => {
        const today = startOfDay(new Date());
        let startDate;

        switch (period) {
            case '6m':
                startDate = subMonths(today, 5); // 5 months ago to include current month fully
                break;
            case '12m':
                startDate = subYears(today, 1);
                break;
            case '5y':
                startDate = subYears(today, 5);
                break;
            case 'all':
                 if (transactions.length === 0 && dividends.length === 0) {
                    startDate = subYears(today, 1);
                } else {
                    const firstTxDate = transactions.length > 0 ? startOfDay(parseISO(transactions.reduce((earliest, tx) => tx.date < earliest.date ? tx : earliest).date)) : today;
                    const firstDivDate = dividends.length > 0 ? startOfDay(parseISO(dividends.reduce((earliest, div) => div.date < earliest.date ? div : earliest).date)) : today;
                    startDate = firstTxDate < firstDivDate ? firstTxDate : firstDivDate;
                }
                break;
        }
        startDate = startOfDay(startDate);

        const interval = { start: startDate, end: today };
        const monthlyData = new Map<string, ProventosChartDataPoint>();

        let monthIterator = new Date(startDate);
        while (monthIterator <= today) {
            const monthKey = format(monthIterator, 'yyyy-MM');
            const monthLabel = format(monthIterator, 'MMM/yy', { locale: ptBR });
            monthlyData.set(monthKey, { date: monthLabel, compras: 0, vendas: 0, custos: 0, proventos: 0 });
            monthIterator.setMonth(monthIterator.getMonth() + 1);
        }

        transactions.forEach(tx => {
            const txDate = startOfDay(parseISO(tx.date));
            if (!isWithinInterval(txDate, interval)) return;

            const monthKey = format(txDate, 'yyyy-MM');
            const monthData = monthlyData.get(monthKey);
            if(monthData) {
                if (tx.type === 'buy') {
                    monthData.compras += tx.quantity * tx.price;
                } else {
                    monthData.vendas += tx.quantity * tx.price;
                }
                monthData.custos += tx.cost || 0;
            }
        });

        dividends.forEach(div => {
            const divDate = startOfDay(parseISO(div.date));
            if (!isWithinInterval(divDate, interval)) return;

            const monthKey = format(divDate, 'yyyy-MM');
            const monthData = monthlyData.get(monthKey);
            if(monthData) {
                monthData.proventos += div.amount;
            }
        });

        const sortedKeys = Array.from(monthlyData.keys()).sort();
        return sortedKeys.map(key => monthlyData.get(key)!);

    }, [transactions, dividends, period]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Operações, Custos e Proventos (Mensal)</CardTitle>
                <div className="flex gap-2">
                    <Button variant={period === '6m' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('6m')}>6M</Button>
                    <Button variant={period === '12m' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('12m')}>12M</Button>
                    <Button variant={period === '5y' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('5y')}>5A</Button>
                    <Button variant={period === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('all')}>Tudo</Button>
                </div>
            </CardHeader>
            <CardContent className="h-80">
                {loading ? <Skeleton className="w-full h-full" /> :
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}/>
                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                        <Legend />
                        <Bar dataKey="compras" stackId="a" fill="#22c55e" name="Compras" />
                        <Bar dataKey="proventos" stackId="a" fill="#3b82f6" name="Proventos" />
                        <Bar dataKey="vendas" fill="#f97316" name="Vendas" />
                        <Bar dataKey="custos" fill="#ef4444" name="Custos" />
                    </BarChart>
                </ResponsiveContainer>
                }
            </CardContent>
        </Card>
    );
}
