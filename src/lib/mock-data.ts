import { B3Portfolio } from './open-banking/types';

// This mock data simulates the portfolio structure received from the B3 integration.
// It includes various asset types to test the detailed pie chart.
export const mockB3Portfolio: B3Portfolio = {
  totalValue: 101850,
  totalCost: 95000,
  totalGainLoss: 6850,
  totalGainLossPercent: 7.21,
  positions: [
    // Ação (Brazilian Stock)
    {
      symbol: 'PETR4',
      assetType: 'STOCK',
      quantity: 500,
      currentPrice: 38.00,
      marketValue: 19000.00,
      gainLossPercent: 10.5,
    },
    // Stock (Foreign Stock)
    {
      symbol: 'AAPL',
      assetType: 'STOCK',
      quantity: 10,
      currentPrice: 210.00, // Assuming price in BRL for simplicity
      marketValue: 10500.00,
      gainLossPercent: 15.0,
    },
    // FII (Real Estate Investment Fund)
    {
      symbol: 'KNRI11',
      assetType: 'FII',
      quantity: 100,
      currentPrice: 165.00,
      marketValue: 16500.00,
      gainLossPercent: 3.1,
    },
    // ETF (Exchange Traded Fund)
    {
      symbol: 'BOVA11',
      assetType: 'ETF',
      quantity: 50,
      currentPrice: 122.00,
      marketValue: 6100.00,
      gainLossPercent: 1.2,
    },
    // Renda Fixa (Fixed Income)
    {
      symbol: 'Tesouro Selic 2029',
      assetType: 'BOND',
      quantity: 2,
      currentPrice: 14000.00,
      marketValue: 28000.00,
      gainLossPercent: 5.8,
    },
    // Cripto (Cryptocurrency)
    {
      symbol: 'BTC',
      assetType: 'CRYPTO',
      quantity: 0.05,
      currentPrice: 435000.00,
      marketValue: 21750.00,
      gainLossPercent: 20.1,
    },
  ],
};

// Legacy mock data, can be removed or kept for other components if needed.
// For the PortfolioPieChart, we will use mockB3Portfolio.
export interface Asset {
  ticker: string;
  assetClass: 'Ação' | 'FII' | 'Renda Fixa' | 'Cripto' | 'ETF' | 'Stock';
  quantity: number;
  averagePrice: number;
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
    ticker: 'VALE3',
    assetClass: 'Ação',
    quantity: 75,
    averagePrice: 65.20,
  },
  {
    ticker: 'BOVA11',
    assetClass: 'ETF',
    quantity: 25,
    averagePrice: 120.50,
  },
  {
    ticker: 'AAPL',
    assetClass: 'Stock',
    quantity: 10,
    averagePrice: 150.00,
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
