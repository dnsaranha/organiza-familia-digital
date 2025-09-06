import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface AssetData {
  symbol: string;
  name: string;
  type: string;
  marketValue: number;
  cost: number;
  dividends: number;
  operations: number;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  yieldOnCost: number;
  profitLoss: number;
  profitability: number;
}

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
}

interface AssetAllocationChartProps {
  assets: AssetData[];
  loading?: boolean;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF1919",
];

const AssetAllocationChart = ({
  assets,
  loading = false,
}: AssetAllocationChartProps) => {
  const [assetFilter, setAssetFilter] = useState("all");
  const [viewType, setViewType] = useState<"type" | "asset">("type");

  const filteredAssets = assets.filter((asset) => {
    if (assetFilter === "all") return true;
    return asset.type?.toLowerCase() === assetFilter.toLowerCase();
  });

  const allocationData: AllocationData[] =
    viewType === "type"
      ? Object.entries(
          filteredAssets.reduce(
            (acc, asset) => {
              const type = asset.type || "Outros";
              acc[type] = (acc[type] || 0) + asset.marketValue;
              return acc;
            },
            {} as Record<string, number>,
          ),
        ).map(([name, value]) => {
          const total = filteredAssets.reduce(
            (sum, asset) => sum + asset.marketValue,
            0,
          );
          return {
            name,
            value,
            percentage: (value / total) * 100,
          };
        })
      : filteredAssets.map((asset) => ({
          name: asset.symbol,
          value: asset.marketValue,
          percentage:
            (asset.marketValue /
              filteredAssets.reduce((sum, a) => sum + a.marketValue, 0)) *
            100,
        }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const exportData = () => {
    const csvContent = [
      [
        "Ativo",
        "Tipo",
        "Quantidade",
        "Preço Atual",
        "Valor de Mercado",
        "Custo",
        "P.M.",
        "YoC (%)",
        "Proventos",
        "Lucro/Prejuízo",
        "Rentabilidade (%)",
      ].join(","),
      ...filteredAssets.map((asset) =>
        [
          asset.symbol,
          asset.type,
          asset.quantity,
          asset.currentPrice,
          asset.marketValue,
          asset.cost,
          asset.averagePrice,
          asset.yieldOnCost,
          asset.dividends,
          asset.profitLoss,
          asset.profitability,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carteira-investimentos.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Composição da Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Carregando dados...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Allocation Pie Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Composição da Carteira</CardTitle>
          <div className="flex gap-2">
            <Select
              value={viewType}
              onValueChange={(value: "type" | "asset") => setViewType(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type">Por Tipo</SelectItem>
                <SelectItem value="asset">Por Ativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ação">Ações</SelectItem>
                <SelectItem value="fii">FIIs</SelectItem>
                <SelectItem value="etf">ETFs</SelectItem>
                <SelectItem value="renda fixa">Renda Fixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {allocationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Valor"]}
                labelFormatter={(label) => `${label}`}
              />
              <Legend
                formatter={(value, entry) => {
                  const data = allocationData.find((d) => d.name === value);
                  return `${value} (${data?.percentage.toFixed(1)}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Asset Breakdown Bar Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Breakdown por Ativo</CardTitle>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={filteredAssets.slice(0, 10)} // Show top 10 assets
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis type="category" dataKey="symbol" width={60} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar
                dataKey="marketValue"
                fill="#3b82f6"
                name="Valor de Mercado"
              />
              <Bar dataKey="cost" fill="#f59e0b" name="Custo" />
              <Bar dataKey="dividends" fill="#10b981" name="Proventos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetAllocationChart;
