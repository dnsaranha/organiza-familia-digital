import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Search, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";

interface AssetData {
  symbol: string;
  name: string;
  type: string;
  currentPrice: number;
  quantity: number;
  marketValue: number;
  cost: number;
  averagePrice: number;
  yieldOnCost: number;
  accumulatedDividends: number;
  profitLoss: number;
  profitability: number;
}

interface EnhancedAssetTableProps {
  assets: AssetData[];
  loading?: boolean;
}

type SortField = keyof AssetData;
type SortDirection = "asc" | "desc";

const EnhancedAssetTable = ({
  assets,
  loading = false,
}: EnhancedAssetTableProps) => {
  const [assetFilter, setAssetFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("marketValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets.filter((asset) => {
      const matchesFilter =
        assetFilter === "all" ||
        asset.type.toLowerCase() === assetFilter.toLowerCase();
      const matchesSearch =
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [assets, assetFilter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const getAssetTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "ação":
        return "bg-blue-100 text-blue-800";
      case "fii":
        return "bg-green-100 text-green-800";
      case "etf":
        return "bg-purple-100 text-purple-800";
      case "renda fixa":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const exportData = () => {
    const csvContent = [
      [
        "Ativo",
        "Nome",
        "Tipo",
        "Preço",
        "Quantidade",
        "Valor de Mercado",
        "Custo",
        "P.M.",
        "YoC (%)",
        "Proventos Acumulados",
        "Lucro/Prejuízo",
        "Rentabilidade (%)",
      ].join(","),
      ...filteredAndSortedAssets.map((asset) =>
        [
          asset.symbol,
          asset.name,
          asset.type,
          asset.currentPrice,
          asset.quantity,
          asset.marketValue,
          asset.cost,
          asset.averagePrice,
          asset.yieldOnCost,
          asset.accumulatedDividends,
          asset.profitLoss,
          asset.profitability,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-ativos.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meus Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando ativos...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Meus Ativos ({filteredAndSortedAssets.length})</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ativo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-48"
              />
            </div>
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-full md:w-32">
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
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="symbol">Ativo</SortableHeader>
                <SortableHeader field="type">Tipo</SortableHeader>
                <SortableHeader field="currentPrice">Preço</SortableHeader>
                <SortableHeader field="quantity">Quantidade</SortableHeader>
                <SortableHeader field="marketValue">
                  Valor de Mercado
                </SortableHeader>
                <SortableHeader field="cost">Custo</SortableHeader>
                <SortableHeader field="averagePrice">P.M.</SortableHeader>
                <SortableHeader field="yieldOnCost">YoC (%)</SortableHeader>
                <SortableHeader field="accumulatedDividends">
                  Proventos Acum.
                </SortableHeader>
                <SortableHeader field="profitLoss">
                  Lucro/Prejuízo
                </SortableHeader>
                <SortableHeader field="profitability">
                  Rentabilidade (%)
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedAssets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm || assetFilter !== "all"
                      ? "Nenhum ativo encontrado com os filtros aplicados."
                      : "Nenhum ativo na carteira."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedAssets.map((asset) => (
                  <TableRow key={asset.symbol} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-24">
                          {asset.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getAssetTypeColor(asset.type)}>
                        {asset.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(asset.currentPrice)}
                    </TableCell>
                    <TableCell>
                      {asset.quantity.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(asset.marketValue)}
                    </TableCell>
                    <TableCell>{formatCurrency(asset.cost)}</TableCell>
                    <TableCell>{formatCurrency(asset.averagePrice)}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatPercent(asset.yieldOnCost)}
                    </TableCell>
                    <TableCell className="text-blue-600 font-medium">
                      {formatCurrency(asset.accumulatedDividends)}
                    </TableCell>
                    <TableCell
                      className={`font-medium ${
                        asset.profitLoss >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(asset.profitLoss)}
                    </TableCell>
                    <TableCell
                      className={`font-medium ${
                        asset.profitability >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {asset.profitability >= 0 ? "+" : ""}
                      {formatPercent(asset.profitability)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAssetTable;
