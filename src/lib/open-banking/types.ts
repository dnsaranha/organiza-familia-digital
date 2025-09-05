// Tipos para Open Banking Brasil
export interface OpenBankingAccount {
  accountId: string;
  brandName: string;
  companyCnpj: string;
  type: 'CONTA_DEPOSITO_A_VISTA' | 'CONTA_POUPANCA' | 'CONTA_PAGAMENTO_PRE_PAGA';
  subtype: string;
  number: string;
  checkDigit: string;
  availableAmount: number;
  blockedAmount: number;
  automaticallyInvestedAmount: number;
}

export interface OpenBankingTransaction {
  transactionId: string;
  completedAuthorisedPaymentType: string;
  creditDebitType: 'CREDITO' | 'DEBITO';
  transactionName: string;
  type: string;
  amount: number;
  transactionCurrency: string;
  transactionDate: string;
  partieCnpjCpf: string;
  partiePersonType: string;
  partieCompeCode: string;
  partieBranchCode: string;
  partieNumber: string;
  partieCheckDigit: string;
}

export interface OpenBankingConsent {
  consentId: string;
  status: 'AWAITING_AUTHORISATION' | 'AUTHORISED' | 'REJECTED' | 'CONSUMED';
  creationDateTime: string;
  expirationDateTime: string;
  permissions: string[];
}

// Tipos para B3
export interface B3Asset {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  marketCap: number;
  volume: number;
  averageDailyVolume3Month: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  dividendYield?: number;
  trailingPE?: number;
  forwardPE?: number;
}

export interface B3Portfolio {
  accountId: string;
  positions: B3Position[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface B3Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  assetType: 'STOCK' | 'FII' | 'ETF' | 'BOND' | 'OPTION';
}

export interface B3Dividend {
  symbol: string;
  exDate: string;
  paymentDate: string;
  amount: number;
  type: 'DIVIDEND' | 'JCP' | 'BONUS';
  status: 'DECLARED' | 'PAID';
}