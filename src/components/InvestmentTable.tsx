import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const InvestmentTable = ({ assets }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ativo</TableHead>
          <TableHead>Classe</TableHead>
          <TableHead className="text-right">Qtde</TableHead>
          <TableHead className="text-right">Valor Atual</TableHead>
          <TableHead className="text-right">Dividendos (Mês)</TableHead>
          <TableHead className="text-right">Rentabilidade %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.ticker}>
            <TableCell className="font-medium">{asset.ticker}</TableCell>
            <TableCell>{asset.class}</TableCell>
            <TableCell className="text-right">{asset.quantity}</TableCell>
            <TableCell className="text-right">
              R$ {asset.currentValue.toLocaleString('pt-BR')}
            </TableCell>
            <TableCell className="text-right">
              R$ {asset.dividends.toLocaleString('pt-BR')}
            </TableCell>
            <TableCell className="text-right text-green-500">
              {asset.profitability.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default InvestmentTable;
