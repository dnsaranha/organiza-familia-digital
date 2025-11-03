import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type ManualInvestmentTransaction = Tables<"investment_transactions">;

interface AssetPosition {
  ticker: string;
  name: string;
  category: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  totalFees: number;
}

export function useManualInvestments() {
  const [transactions, setTransactions] = useState<ManualInvestmentTransaction[]>([]);
  const [positions, setPositions] = useState<AssetPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      calculatePositions(data || []);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePositions = (txs: ManualInvestmentTransaction[]) => {
    const positionMap = new Map<string, AssetPosition>();

    txs.forEach((tx) => {
      const existing = positionMap.get(tx.ticker);
      const txFees = tx.fees || 0;
      
      if (tx.transaction_type === "buy") {
        if (existing) {
          const newQuantity = existing.quantity + tx.quantity;
          const newCost = existing.totalCost + (tx.quantity * tx.price) + txFees;
          positionMap.set(tx.ticker, {
            ...existing,
            quantity: newQuantity,
            totalCost: newCost,
            totalFees: existing.totalFees + txFees,
            averagePrice: newCost / newQuantity,
          });
        } else {
          const cost = (tx.quantity * tx.price) + txFees;
          positionMap.set(tx.ticker, {
            ticker: tx.ticker,
            name: tx.asset_name,
            category: (tx as any).category || "ACAO",
            quantity: tx.quantity,
            averagePrice: cost / tx.quantity,
            totalCost: cost,
            totalFees: txFees,
          });
        }
      } else if (tx.transaction_type === "sell" && existing) {
        const newQuantity = existing.quantity - tx.quantity;
        const proportionSold = tx.quantity / existing.quantity;
        const costReduction = existing.totalCost * proportionSold;
        
        if (newQuantity > 0) {
          positionMap.set(tx.ticker, {
            ...existing,
            quantity: newQuantity,
            totalCost: existing.totalCost - costReduction,
            averagePrice: (existing.totalCost - costReduction) / newQuantity,
          });
        } else {
          positionMap.delete(tx.ticker);
        }
      }
    });

    setPositions(Array.from(positionMap.values()));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    positions,
    loading,
    refresh: fetchTransactions,
  };
}
