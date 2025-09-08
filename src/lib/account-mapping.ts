export const accountSubtypeMapping: { [key: string]: string } = {
  CHECKING_ACCOUNT: "Conta Corrente",
  SAVINGS_ACCOUNT: "Conta Poupança",
  CREDIT_CARD: "Cartão de Crédito",
  INVESTMENT: "Investimento",
  OTHER: "Outro",
};

export function mapAccountSubtype(subtype: string | null): string {
  if (!subtype) return "Não disponível";
  return accountSubtypeMapping[subtype] || subtype;
}
