import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { mockPortfolio } from '@/lib/mock-data';
import { B3Portfolio } from '@/lib/open-banking/types';

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
  'Stock': '#FF1919'
};

const PortfolioPieChart = ({ portfolio, showMockData = false }: PortfolioPieChartProps) => {
  // Função para mapear tipos de ativos
  const getAssetClassName = (assetType: string): string => {
    switch (assetType.toUpperCase()) {
      case 'STOCK': return 'Ação';
      case 'FII': return 'FII';
      case 'ETF': return 'ETF';
      case 'BOND': return 'Renda Fixa';
      case 'CRYPTO': return 'Cripto';
      default: return 'Outros';
    }
  };

  // Preparar dados do gráfico
  const chartData = React.useMemo(() => {
    let dataSource;
    
    if (portfolio && portfolio.positions.length > 0) {
      // Usar dados reais da carteira
      dataSource = portfolio.positions.map(position => ({
        ticker: position.symbol,
        assetClass: getAssetClassName(position.assetType),
        value: position.marketValue,
      }));
    } else if (showMockData) {
      // Usar dados simulados
      dataSource = mockPortfolio.map(asset => ({
        ticker: asset.ticker,
        assetClass: asset.assetClass,
        value: asset.quantity * asset.averagePrice,
      }));
    } else {
      return [];
    }

    // Agrupar por classe de ativo
    const grouped = dataSource.reduce((acc, item) => {
      const existing = acc.find(group => group.name === item.assetClass);
      if (existing) {
        existing.value += item.value;
        existing.assets.push(item.ticker);
      } else {
        acc.push({
          name: item.assetClass,
          value: item.value,
          assets: [item.ticker],
        });
      }
      return acc;
    }, [] as Array<{ name: string; value: number; assets: string[] }>);

    // Calcular percentuais
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
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Valor: {data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-sm text-muted-foreground">
            Participação: {data.percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
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
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
            <span className="text-xs text-muted-foreground">
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
            {!portfolio ? 'Conecte sua corretora para ver a distribuição' : 'Carteira vazia'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioPieChart;