export interface Asset {
  ticker: string;
  assetClass: 'Ação' | 'FII' | 'Renda Fixa' | 'Cripto';
  quantity: number;
  averagePrice: number; // Preço médio de compra
}

export const mockPortfolio: Asset[] = [
  {
    ticker: 'PETR4',
    assetClass: 'Ação',
    quantity: 100,
    averagePrice: 30.50,
  },
  {
    ticker: 'KNRI11',
    assetClass: 'FII',
    quantity: 50,
    averagePrice: 160.00,
  },
  {
    ticker: 'Tesouro Selic 2029',
    assetClass: 'Renda Fixa',
    quantity: 2,
    averagePrice: 13800.00,
  },
  {
    ticker: 'BTC',
    assetClass: 'Cripto',
    quantity: 0.05,
    averagePrice: 300000.00,
  },
];
