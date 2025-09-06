import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { mockB3Portfolio } from '@/lib/mock-data'; // Updated import
import { B3Portfolio, B3Position } from '@/lib/open-banking/types';

interface PortfolioPieChartProps {
  portfolio?: B3Portfolio | null;
  showMockData?: boolean;
}

const COLORS = {
  'Ação': '#0088FE',
  'FII': '#00C49F',
  'Renda Fixa': '#FFBB28',
  'Cripto': '#FF8042',
  'ETF': '#AF19FF',
  'Stock': '#FF1919',
  'Outros': '#8884d8',
};

// Helper function to determine if a string is a Brazilian stock symbol
const isBrazilianStock = (symbol: string): boolean => {
  // Brazilian stocks usually end with 3, 4, 5, 6, or 11.
  // This is a simplified check.
  return /\d$/.test(symbol);
};

const PortfolioPieChart = ({ portfolio, showMockData = false }: PortfolioPieChartProps) => {
  // New, more robust function to classify assets
  const getAssetClassName = (position: B3Position): string => {
    const { assetType, symbol } = position;
    switch (assetType.toUpperCase()) {
      case 'STOCK':
        return isBrazilianStock(symbol) ? 'Ação' : 'Stock';
      case 'FII':
        return 'FII';
      case 'ETF':
        return 'ETF';
      case 'BOND':
        return 'Renda Fixa';
      case 'CRYPTO':
        return 'Cripto';
      default:
        return 'Outros';
    }
  };

  // Prepare data for the chart
  const chartData = React.useMemo(() => {
    let positions: B3Position[] = [];

    if (portfolio && portfolio.positions.length > 0) {
      positions = portfolio.positions;
    } else if (showMockData) {
      positions = mockB3Portfolio.positions; // Use the new mock data
    } else {
      return [];
    }

    // Group assets by class
    const grouped = positions.reduce((acc, position) => {
      const assetClass = getAssetClassName(position);
      const existing = acc.find(group => group.name === assetClass);

      if (existing) {
        existing.value += position.marketValue;
        existing.assets.push(position.symbol);
      } else {
        acc.push({
          name: assetClass,
          value: position.marketValue,
          assets: [position.symbol],
        });
      }
      return acc;
    }, [] as Array<{ name: string; value: number; assets: string[] }>);

    // Calculate percentages
    const total = grouped.reduce((sum, item) => sum + item.value, 0);
    return grouped.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [portfolio, showMockData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-bold mb-1">{data.name}</p>
          <p>
            <span className="text-muted-foreground">Valor:</span>{' '}
            {data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p>
            <span className="text-muted-foreground">Participação:</span>{' '}
            {data.percentage.toFixed(2)}%
          </p>
          <div className="border-t my-2" />
          <p className="text-xs text-muted-foreground">
            Ativos: {data.assets.join(', ')}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.value}</span>
            <span className="text-muted-foreground">
              ({entry.payload.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="font-medium">Nenhum dado de alocação disponível</p>
          <p className="text-sm mt-1">
            {!portfolio ? 'Conecte sua corretora para ver a distribuição' : 'Sua carteira está vazia.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={'60%'} // Donut chart effect
            outerRadius={'80%'}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
              const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
              return (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Outros']}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} verticalAlign="bottom" wrapperStyle={{ bottom: -10 }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioPieChart;