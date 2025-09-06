import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialData } from '@/hooks/useFinancialData';
import { financialDataClient } from '@/lib/financial-data/client';
import { format, subMonths, subYears, startOfDay, isAfter, parseISO, getYear, getMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown } from 'lucide-react';

type Period = '6m' | '12m' | '5y' | 'all';

interface ChartDataPoint {
  date: string;
  patrimonio: number | null;
  rentabilidade: number | null;
  cdi: number | null;
}

// Helper to find the closest data point in the past
const findClosestPastData = (timestamps: number[], prices: number[], targetTimestamp: number) => {
    let closestIndex = -1;
    for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i] <= targetTimestamp) {
            closestIndex = i;
            break;
        }
    }
    return closestIndex !== -1 ? prices[closestIndex] : null;
};

const ProfitabilityTable = ({ data }: { data: ChartDataPoint[] }) => {
    const tableData = useMemo(() => {
        const yearlyData: Record<number, { months: (number | null)[], total: number, accumulated: number }> = {};

        const returnsByMonth: Record<string, {start: number | null, end: number | null}> = {};

        data.forEach(d => {
            if (d.rentabilidade !== null) {
                const [day, monthStr, yearStr] = d.date.split('/');
                const year = parseInt(yearStr, 10) + 2000;
                const month = parseInt(monthStr, 10) -1;
                const key = `${year}-${month}`;

                if (!returnsByMonth[key]) {
                    returnsByMonth[key] = { start: d.rentabilidade, end: d.rentabilidade };
                } else {
                    if(returnsByMonth[key].start === null) returnsByMonth[key].start = d.rentabilidade;
                    returnsByMonth[key].end = d.rentabilidade;
                }
            }
        });

        Object.entries(returnsByMonth).forEach(([key, value]) => {
            const [year, month] = key.split('-').map(Number);

            if (!yearlyData[year]) {
                yearlyData[year] = { months: Array(12).fill(null), total: 0, accumulated: 0 };
            }
            if(value.start !== null && value.end !== null) {
                const startReturn = 1 + value.start / 100;
                const endReturn = 1 + value.end / 100;
                yearlyData[year].months[month] = (endReturn / startReturn - 1) * 100;
            }
        });

        let accumulated = 1;
        const sortedYears = Object.keys(yearlyData).map(Number).sort((a,b) => a-b);

        for(const year of sortedYears) {
            const yearData = yearlyData[year];
            let yearAccumulated = 1;
            for(const monthlyReturn of yearData.months) {
                if(monthlyReturn !== null) {
                    yearAccumulated *= (1 + monthlyReturn / 100);
                }
            }
            yearData.total = (yearAccumulated - 1) * 100;
            accumulated *= yearAccumulated;
            yearData.accumulated = (accumulated - 1) * 100;
        }

        return yearlyData;
    }, [data]);

    const years = Object.keys(tableData).map(Number).sort((a, b) => b - a);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    if(years.length === 0) return null;

    return (
        <Collapsible className="mt-6 border-t pt-4">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-center">
                    <ChevronsUpDown className="h-4 w-4 mr-2"/>
                    Ver Rentabilidade Mensal Detalhada
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ano</TableHead>
                            {months.map(m => <TableHead key={m} className="text-center">{m}</TableHead>)}
                            <TableHead className="text-right font-semibold">Total</TableHead>
                            <TableHead className="text-right font-semibold">Acumulado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {years.map(year => (
                            <TableRow key={year}>
                                <TableCell className="font-medium">{year}</TableCell>
                                {tableData[year].months.map((ret, index) => (
                                    <TableCell key={index} className={`text-center text-sm ${ret === null ? 'text-muted-foreground' : ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {ret !== null ? `${ret.toFixed(2)}%` : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className={`text-right font-medium ${tableData[year].total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tableData[year].total.toFixed(2)}%
                                </TableCell>
                                <TableCell className={`text-right font-medium ${tableData[year].accumulated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tableData[year].accumulated.toFixed(2)}%
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CollapsibleContent>
        </Collapsible>
    )
}


export const DashboardPatrimonio = () => {
  const { transactions } = useFinancialData();
  const [period, setPeriod] = useState<Period>('12m');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const startDate = useMemo(() => {
    const today = startOfDay(new Date());
    switch (period) {
      case '6m': return subMonths(today, 6);
      case '12m': return subYears(today, 1);
      case '5y': return subYears(today, 5);
      case 'all':
        if (transactions.length === 0) return subYears(today, 1);
        const firstDate = transactions.reduce((earliest, tx) => {
          const txDate = startOfDay(parseISO(tx.date));
          return isAfter(earliest, txDate) ? txDate : earliest;
        }, today);
        return firstDate;
    }
  }, [period, transactions]);

  const generateChartData = useCallback(async () => {
    if (transactions.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
    }
    setLoading(true);

    const today = startOfDay(new Date());
    const from = format(startDate, 'yyyy-MM-dd');
    const to = format(today, 'yyyy-MM-dd');

    const symbols = [...new Set(transactions.map(tx => tx.symbol))];
    const assetHistoryPromises = symbols.map(symbol => financialDataClient.getAssetHistory(symbol, from, to));
    const cdiHistoryPromise = financialDataClient.getCDIHistory(365 * 5);

    const [cdiResult, ...assetResults] = await Promise.allSettled([cdiHistoryPromise, ...assetHistoryPromises]);

    const historicalPrices: Record<string, { timestamps: number[], prices: number[] }> = {};
    assetResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            historicalPrices[symbols[index]] = result.value;
        }
    });

    const cdiHistory = cdiResult.status === 'fulfilled' && cdiResult.value ? cdiResult.value : { timestamps: [], prices: [] };
    const cdiBaseValue = findClosestPastData(cdiHistory.timestamps, cdiHistory.prices, startDate.getTime());

    const processedData: ChartDataPoint[] = [];
    let currentDate = startOfDay(startDate);

    while (currentDate <= today) {
        let dailyMarketValue = 0;
        let dailyCost = 0;

        const relevantTransactions = transactions.filter(tx => startOfDay(parseISO(tx.date)) <= currentDate);

        const portfolioAtDate = new Map<string, { quantity: number; totalCost: number }>();
        relevantTransactions.forEach(tx => {
            const pos = portfolioAtDate.get(tx.symbol) || { quantity: 0, totalCost: 0 };
            if (tx.type === 'buy') {
                pos.quantity += tx.quantity;
                pos.totalCost += tx.quantity * tx.price + (tx.cost || 0);
            } else {
                const avgPrice = pos.quantity > 0 ? pos.totalCost / pos.quantity : 0;
                pos.totalCost -= tx.quantity * avgPrice;
                pos.quantity -= tx.quantity;
            }
            portfolioAtDate.set(tx.symbol, pos);
        });

        portfolioAtDate.forEach((pos, symbol) => {
            if (pos.quantity > 0) {
                const history = historicalPrices[symbol];
                if (history && history.timestamps.length > 0) {
                    const price = findClosestPastData(history.timestamps, history.prices, currentDate.getTime());
                    if (price !== null) {
                        dailyMarketValue += pos.quantity * price;
                        dailyCost += pos.totalCost;
                    }
                }
            }
        });

        const cdiCurrentValue = findClosestPastData(cdiHistory.timestamps, cdiHistory.prices, currentDate.getTime());
        const cdiNormalized = cdiBaseValue && cdiCurrentValue ? (cdiCurrentValue / cdiBaseValue - 1) * 100 : null;

        processedData.push({
            date: format(currentDate, 'dd/MM/yy'),
            patrimonio: dailyMarketValue > 0 ? dailyMarketValue : null,
            rentabilidade: dailyCost > 0 ? (dailyMarketValue / dailyCost - 1) * 100 : null,
            cdi: cdiNormalized,
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    setChartData(processedData);
    setLoading(false);
  }, [transactions, startDate]);

  useEffect(() => {
    generateChartData();
  }, [generateChartData]);


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Evolução Patrimonial</CardTitle>
        <div className="flex gap-2">
            <Button variant={period === '6m' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('6m')}>6M</Button>
            <Button variant={period === '12m' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('12m')}>12M</Button>
            <Button variant={period === '5y' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('5y')}>5A</Button>
            <Button variant={period === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('all')}>Tudo</Button>
        </div>
      </CardHeader>
      <CardContent className="h-auto">
        <div className="h-96">
            {loading ? <Skeleton className="w-full h-full" /> :
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" stroke="#8884d8" tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip
                    formatter={(value: number, name: string) => {
                        if (name === 'patrimonio') {
                            return [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Patrimônio'];
                        }
                        return [`${value.toFixed(2)}%`, name === 'rentabilidade' ? 'Rentabilidade' : 'CDI'];
                    }}
                />
                <Legend />
                <Line connectNulls yAxisId="left" type="monotone" dataKey="patrimonio" name="Patrimônio" stroke="#8884d8" dot={false} />
                <Line connectNulls yAxisId="right" type="monotone" dataKey="rentabilidade" name="Rentabilidade" stroke="#82ca9d" dot={false} />
                <Line connectNulls yAxisId="right" type="monotone" dataKey="cdi" name="CDI" stroke="#ffc658" dot={false} />
            </LineChart>
            </ResponsiveContainer>
            }
        </div>
        {!loading && chartData.length > 0 && <ProfitabilityTable data={chartData} />}
      </CardContent>
    </Card>
  );
};
