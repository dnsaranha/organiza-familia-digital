
export interface Transaction {
  id: string;
  ticker: string;
  asset_name: string;
  transaction_type: "buy" | "sell";
  quantity: number;
  price: number;
  transaction_date: string;
  fees: number;
  notes: string | null;
  user_id?: string;
}

export interface Position {
  ticker: string;
  asset_name: string;
  quantity: number;
  totalCost: number;
  averagePrice: number;
}

export const calculateManualPositions = (transactions: Transaction[]): Position[] => {
  const byTicker: Record<string, Transaction[]> = {};

  // Group transactions by ticker
  transactions.forEach(t => {
    const ticker = t.ticker.toUpperCase();
    if (!byTicker[ticker]) byTicker[ticker] = [];
    byTicker[ticker].push(t);
  });

  const positions: Position[] = [];

  for (const ticker in byTicker) {
    // Sort by date ascending for correct average price calculation
    const txs = byTicker[ticker].sort((a, b) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    let quantity = 0;
    let totalCostBasis = 0;
    let assetName = txs[0]?.asset_name || ticker;

    for (const t of txs) {
      // Update asset name to the most recent one if available
      if (t.asset_name) assetName = t.asset_name;

      if (t.transaction_type === 'buy') {
        const cost = (t.quantity * t.price) + t.fees;
        totalCostBasis += cost;
        quantity += t.quantity;
      } else if (t.transaction_type === 'sell') {
         if (quantity > 0) {
            const avgPrice = totalCostBasis / quantity;
            // When selling, we reduce the cost basis proportionally
            const costOfSold = t.quantity * avgPrice;
            totalCostBasis -= costOfSold;
            quantity -= t.quantity;
         }
      }
    }

    // Filter out closed positions or near-zero quantities
    if (quantity > 0.000001) {
        positions.push({
            ticker,
            asset_name: assetName,
            quantity,
            totalCost: totalCostBasis,
            averagePrice: totalCostBasis / quantity
        });
    }
  }

  return positions;
};
