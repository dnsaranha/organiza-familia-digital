import { useState, useEffect, useCallback, useMemo } from 'react';
import { mockPortfolio, Asset } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AssetPrice {
  symbol: string;
  price: number;
}

const monthlyProfitabilityData = [
  { month: 'Jan', profitability: 1.2 },
  { month: 'Fev', profitability: -0.5 },
  { month: 'Mar', profitability: 2.8 },
  { month: 'Abr', profitability: 2.1 },
  { month: 'Mai', profitability: 3.5 },
  { month: 'Jun', profitability: 1.8 },
];

const InvestmentsPage = () => {
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const symbols = mockPortfolio.map(asset => {
      if (asset.ticker === 'BTC') return 'BTC-BRL';
      if (asset.assetClass === 'Ação' || asset.assetClass === 'FII') return `${asset.ticker}.SA`;
      return asset.ticker;
    }).join(',');

    try {
      const { data, error } = await supabase.functions.invoke(`get-asset-prices?symbols=${symbols}`);
      if (error) throw error;
      const prices = data.reduce((acc: Record<string, number>, price: AssetPrice) => {
        let internalSymbol = price.symbol.replace('.SA', '');
        if (price.symbol === 'BTC-BRL') internalSymbol = 'BTC';
        if (price.price) acc[internalSymbol] = price.price;
        return acc;
      }, {});
      setAssetPrices(prices);
    } catch (err: any) {
      setError('Falha ao buscar os preços dos ativos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssetPrices();
  }, [fetchAssetPrices]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const allocationData = useMemo(() => {
    if (isLoading || Object.keys(assetPrices).length === 0) return [];

    const allocation = mockPortfolio.reduce((acc, asset) => {
      const currentPrice = assetPrices[asset.ticker];
      if (currentPrice) {
        const currentValue = currentPrice * asset.quantity;
        acc[asset.assetClass] = (acc[asset.assetClass] || 0) + currentValue;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(allocation).map(([name, value]) => ({ name, value }));
  }, [assetPrices, isLoading]);

  const totalInvested = mockPortfolio.reduce((acc, asset) => acc + (asset.averagePrice * asset.quantity), 0);
  const monthlyYield = 1234.56; // Placeholder
  const dividends = 456.78; // Placeholder

  const getAssetDisplayData = (asset: Asset) => {
    const currentPrice = assetPrices[asset.ticker];
    const currentValue = currentPrice ? currentPrice * asset.quantity : null;
    const initialValue = asset.averagePrice * asset.quantity;
    const profitability = currentValue ? ((currentValue - initialValue) / initialValue) * 100 : null;
    return { currentValue, profitability };
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Carteira de Investimentos</h1>
        <p className="text-muted-foreground">Resumo da sua carteira e performance dos ativos.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Valor Total Investido</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-xs text-muted-foreground">Baseado no custo de aquisição.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Rentabilidade Mensal</CardTitle><span className="text-green-500">+2.5%</span></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyYield.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-xs text-muted-foreground">Performance no último mês.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Dividendos Recebidos (Mês)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dividends.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <p className="text-xs text-muted-foreground">Total de proventos no mês.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Alocação por Classe</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><Skeleton className="h-48 w-48 rounded-full" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">
                    {allocationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
           <CardHeader><CardTitle>Rentabilidade Mensal (%)</CardTitle></CardHeader>
           <CardContent>
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={monthlyProfitabilityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Rentabilidade']} />
                <Legend />
                <Line type="monotone" dataKey="profitability" name="Rentabilidade" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Meus Ativos</CardTitle></CardHeader>
          <CardContent>
            {error && <p className="text-red-500 text-center py-4">{error}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead><TableHead>Classe</TableHead><TableHead className="text-right">Qtde.</TableHead><TableHead className="text-right">Valor Atual</TableHead><TableHead className="text-right">Dividendos (Mês)</TableHead><TableHead className="text-right">Rentabilidade %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: mockPortfolio.length }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-10 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-24 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-24 inline-block" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-20 inline-block" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  mockPortfolio.map((asset) => {
                    const { currentValue, profitability } = getAssetDisplayData(asset);
                    return (
                      <TableRow key={asset.ticker}>
                        <TableCell className="font-medium">{asset.ticker}</TableCell><TableCell><Badge variant="outline">{asset.assetClass}</Badge></TableCell><TableCell className="text-right">{asset.quantity.toLocaleString('pt-BR')}</TableCell><TableCell className="text-right font-medium">{currentValue ? currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}</TableCell><TableCell className="text-right">-</TableCell><TableCell className={`text-right font-medium ${profitability === null ? '' : profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitability !== null ? `${profitability.toFixed(2)}%` : 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvestmentsPage;
