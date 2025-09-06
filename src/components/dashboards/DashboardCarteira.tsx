import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useFinancialData } from '@/hooks/useFinancialData';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const getAssetClassName = (assetType: string): string => {
    switch (assetType) {
      case 'STOCK': return 'Ação';
      case 'FII': return 'FII';
      case 'ETF': return 'ETF';
      case 'CRYPTO': return 'Cripto';
      case 'BOND': return 'Renda Fixa';
      default: return 'Outros';
    }
};

export const DashboardCarteira = () => {
    const { portfolio, dividends, transactions, loading } = useFinancialData();
    const [assetFilter, setAssetFilter] = useState('all');

    const allocationData = useMemo(() => {
        if (!portfolio) return [];
        const allocation = portfolio.positions.reduce((acc, position) => {
            const assetClass = getAssetClassName(position.assetType);
            acc[assetClass] = (acc[assetClass] || 0) + position.marketValue;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(allocation).map(([name, value]) => ({ name, value }));
    }, [portfolio]);

    const filteredPositions = useMemo(() => {
        if (!portfolio) return [];
        if (assetFilter === 'all') return portfolio.positions;
        return portfolio.positions.filter(p => p.assetType === assetFilter);
    }, [portfolio, assetFilter]);

    const positionsWithAddons = useMemo(() => {
        if(!portfolio) return [];
        return filteredPositions.map(pos => {
            const positionDividends = dividends.filter(div => div.symbol === pos.symbol);
            const totalDividends = positionDividends.reduce((sum, div) => sum + div.amount, 0);
            const yoc = pos.totalCost > 0 ? (totalDividends / pos.totalCost) * 100 : 0;

            const assetTransactions = transactions.filter(t => t.symbol === pos.symbol);
            const operations = assetTransactions.reduce((sum, tx) => sum + (tx.quantity * tx.price), 0);

            return {
                ...pos,
                accumulatedDividends: totalDividends,
                yoc: yoc,
                operations: operations,
            }
        });
    }, [filteredPositions, dividends, portfolio, transactions]);

    const exportToCSV = () => {
        const headers = ["Ativo", "Classe", "Qtde", "Preço Médio", "Custo Total", "Preço Atual", "Valor de Mercado", "Lucro/Prejuízo", "Rentabilidade %", "Dividendos Acumulados", "YoC %"];
        const rows = positionsWithAddons.map(p => [
            p.symbol,
            getAssetClassName(p.assetType),
            p.quantity,
            p.averagePrice.toFixed(2),
            p.totalCost.toFixed(2),
            p.currentPrice.toFixed(2),
            p.marketValue.toFixed(2),
            p.gainLoss.toFixed(2),
            p.gainLossPercent.toFixed(2),
            p.accumulatedDividends.toFixed(2),
            p.yoc.toFixed(2),
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "carteira_de_ativos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const BAR_COLORS = { "Valor de Mercado": "#8884d8", "Custo Total": "#82ca9d", "Proventos": "#ffc658" };

    if(loading) {
        return (
            <Card>
                <CardHeader><CardTitle>Minha Carteira de Ativos</CardTitle></CardHeader>
                <CardContent>
                    <Skeleton className="w-full h-96" />
                </CardContent>
            </Card>
        )
    }

    if(!portfolio) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Minha Carteira de Ativos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="md:col-span-1 h-80">
                        <h4 className="text-center font-semibold mb-2">Alocação por Classe</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                    {allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="md:col-span-2 h-80">
                         <h4 className="text-center font-semibold mb-2">Composição por Ativo</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={positionsWithAddons} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}/>
                                <YAxis type="category" dataKey="symbol" width={60} />
                                <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/>
                                <Legend />
                                <Bar dataKey="marketValue" name="Valor de Mercado" fill={BAR_COLORS["Valor de Mercado"]} />
                                <Bar dataKey="totalCost" name="Custo Total" fill={BAR_COLORS["Custo Total"]} />
                                <Bar dataKey="accumulatedDividends" name="Proventos" fill={BAR_COLORS["Proventos"]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Meus Ativos</h3>
                        <div className="flex gap-4">
                            <Select value={assetFilter} onValueChange={setAssetFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filtrar por classe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Classes</SelectItem>
                                    <SelectItem value="STOCK">Ações</SelectItem>
                                    <SelectItem value="FII">FIIs</SelectItem>
                                    <SelectItem value="ETF">ETFs</SelectItem>
                                    <SelectItem value="CRYPTO">Cripto</SelectItem>
                                    <SelectItem value="BOND">Renda Fixa</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="h-4 w-4 mr-2"/> Exportar CSV</Button>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ativo</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                                <TableHead className="text-right">Qtde.</TableHead>
                                <TableHead className="text-right">Valor Mercado</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                                <TableHead className="text-right">P.M.</TableHead>
                                <TableHead className="text-right">YoC %</TableHead>
                                <TableHead className="text-right">Proventos</TableHead>
                                <TableHead className="text-right">L/P</TableHead>
                                <TableHead className="text-right">Rentab. %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {positionsWithAddons.map(p => (
                                <TableRow key={p.symbol}>
                                    <TableCell>
                                        <div className="font-medium">{p.symbol}</div>
                                        <Badge variant="outline">{getAssetClassName(p.assetType)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{p.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">{p.quantity}</TableCell>
                                    <TableCell className="text-right font-semibold">{p.marketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">{p.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">{p.averagePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className={`text-right font-semibold ${p.yoc > 0 ? "text-blue-600" : ""}`}>{p.yoc.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{p.accumulatedDividends.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className={`text-right font-semibold ${p.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>{p.gainLoss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className={`text-right font-semibold ${p.gainLossPercent >= 0 ? "text-green-600" : "text-red-600"}`}>{p.gainLossPercent.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
