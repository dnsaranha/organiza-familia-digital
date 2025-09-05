// Minimal type definitions for B3 integration (broadened to match current usage)
export interface B3Asset {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  currency?: string;
  // Used in UI for real-time quotes
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

export interface B3Position {
  symbol: string;
  quantity: number;
  averagePrice?: number;
  currentPrice: number;
  value?: number;
  marketValue: number;
  gainLossPercent: number;
  assetType: string; // e.g., STOCK, FII, ETF, BOND
}

export interface B3Portfolio {
  positions: B3Position[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface B3Dividend {
  symbol: string;
  amount: number;
  paymentDate: string; // ISO date
}
