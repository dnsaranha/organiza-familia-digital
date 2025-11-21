import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface FinancialCardProps {
  title: string;
  value: number;
  type: "balance" | "income" | "expense";
  icon: LucideIcon;
  className?: string;
}

export const FinancialCard = ({
  title,
  value,
  type,
  icon: Icon,
  className,
}: FinancialCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getCardStyles = () => {
    switch (type) {
      case "income":
        return "bg-gradient-success text-success-foreground shadow-success border-success/20";
      case "expense":
        return "bg-gradient-expense text-expense-foreground shadow-expense border-expense/20";
      default:
        return "bg-gradient-primary text-primary-foreground shadow-button border-primary/20";
    }
  };

  const getValueColor = () => {
    switch (type) {
      case "income":
        return "text-success";
      case "expense":
        return "text-expense";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-smooth hover:scale-105",
        type !== "balance" ? "bg-gradient-card" : getCardStyles(),
        "shadow-card border w-full",
        className,
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
            <p
              className={cn(
                "text-xs sm:text-sm font-medium truncate",
                type === "balance"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "text-lg sm:text-xl md:text-2xl font-bold truncate",
                type === "balance"
                  ? "text-primary-foreground"
                  : getValueColor(),
              )}
            >
              {formatCurrency(value)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-full p-2 sm:p-3 ml-2 sm:ml-4 flex-shrink-0",
              type === "balance" ? "bg-primary-foreground/10" : "bg-muted/50",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6",
                type === "balance"
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
