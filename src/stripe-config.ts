export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_Sv7t99cA7bEeXv',
    priceId: 'price_1RzHdZHcVbxMAUgHWZXTsnsM',
    name: 'Assinatatura Gratuita',
    description: 'Plano gratuito com funcionalidades básicas para gestão financeira pessoal',
    mode: 'payment',
    price: 0.00,
    currency: 'BRL',
  },
  {
    id: 'prod_Sv7pIweNKESXRN',
    priceId: 'price_1RzHZNHcVbxMAUgHPNnvPWb3',
    name: 'Assinatura Básica',
    description: 'Plano básico com recursos essenciais para gestão financeira familiar',
    mode: 'subscription',
    price: 0.00,
    currency: 'BRL',
  },
  {
    id: 'prod_Sv7o0atd2j7Z4R',
    priceId: 'price_1RzHYrHcVbxMAUgHpGDGvwKX',
    name: 'Assinatura Avançada',
    description: 'Plano completo com todos os recursos avançados e suporte prioritário',
    mode: 'subscription',
    price: 0.00,
    currency: 'BRL',
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};