export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    priceId: 'price_1RzHdZHcVbxMAUgHWZXTsnsM',
    name: 'Assuntatura Gratuita',
    description: 'Plano gratuito com funcionalidades básicas',
    mode: 'payment',
  },
  {
    priceId: 'price_1RzHZNHcVbxMAUgHPNnvPWb3',
    name: 'Assinatura Básica',
    description: 'Plano básico com recursos essenciais para gestão financeira familiar',
    mode: 'subscription',
  },
  {
    priceId: 'price_1RzHYrHcVbxMAUgHpGDGvwKX',
    name: 'Assinatura Avançada',
    description: 'Plano completo com todos os recursos avançados e suporte prioritário',
    mode: 'subscription',
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};