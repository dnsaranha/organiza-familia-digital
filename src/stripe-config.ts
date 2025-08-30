export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface StripeProduct {
  priceId: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  mode: 'free' | 'subscription' | 'premium_interest';
  isPopular?: boolean;
  icon: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    priceId: '',
    name: 'Plano Gratuito',
    price: 'R$ 0,00',
    description: 'Introdução ao controle financeiro pessoal e familiar de forma simples e gratuita.',
    features: [
      'Cadastro de receitas e despesas',
      'Relatórios simples (visão mensal)',
      '1 grupo familiar',
      'Suporte por e-mail',
    ],
    mode: 'free',
    icon: 'Star',
  },
  {
    priceId: 'price_essential_990_placeholder', // NOTE: Placeholder Price ID
    name: 'Plano Essencial',
    price: 'R$ 9,90',
    description: 'Expansão de funcionalidades, oferecendo maior organização e relatórios detalhados.',
    features: [
      'Tudo do Plano Gratuito',
      'Grupos familiares ilimitados',
      'Relatórios avançados (comparativos, exportação PDF/Excel)',
      'Notificações personalizadas (contas, vencimentos)',
      'Suporte prioritário',
    ],
    mode: 'subscription',
    isPopular: true,
    icon: 'Zap',
  },
  {
    priceId: 'price_advanced_1990_placeholder', // NOTE: Placeholder Price ID
    name: 'Plano Avançado',
    price: 'R$ 19,90',
    description: 'Planejamento financeiro de médio e longo prazo, com análises mais completas.',
    features: [
      'Tudo do Plano Essencial',
      'Painel de gráficos interativos',
      'Metas financeiras e projeções',
      'Busca avançada de transações',
      'Relatórios por membro da família',
      'Backup em nuvem (multi-dispositivo)',
    ],
    mode: 'subscription',
    icon: 'Crown',
  },
  {
    priceId: '',
    name: 'Plano Premium',
    price: 'R$ 29,90',
    description: 'Inteligência financeira e automação completa para um controle financeiro proativo.',
    features: [
      'Tudo do Plano Avançado',
      '🤖 Inteligência artificial para insights',
      '📊 Relatórios preditivos',
      'Integração bancária (CSV/OFX/Open Finance)',
      'Alertas de gastos fora do padrão',
    ],
    mode: 'premium_interest',
    icon: 'Bot',
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};