import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Zap, Loader2, Bot } from 'lucide-react';
import { stripeProducts, StripeProduct } from '@/stripe-config';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PlanIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const icons: { [key: string]: React.ElementType } = {
    Star,
    Zap,
    Crown,
    Bot,
  };
  const IconComponent = icons[iconName] || Check;
  return <IconComponent className={className} />;
};

const getButtonContent = (product: StripeProduct) => {
  switch (product.mode) {
    case 'free':
      return 'Começar Grátis';
    case 'subscription':
      return 'Assinar Agora';
    case 'premium_interest':
      return 'Registrar Interesse';
    default:
      return 'Ver Detalhes';
  }
};

export const SubscriptionPlans = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubscribe = async (product: StripeProduct) => {
    if (!user) {
      toast({
        title: 'Acesso Negado',
        description: 'Você precisa estar logado para selecionar um plano.',
        variant: 'destructive',
      });
      return;
    }

    if (product.mode === 'premium_interest') {
      toast({
        title: 'Interesse Registrado!',
        description: 'Obrigado! Avisaremos você assim que o Plano Premium estiver disponível.',
      });
      // TODO: Implement backend logic to save user interest
      return;
    }

    if (product.mode === 'free') {
      toast({
        title: 'Plano Gratuito',
        description: 'Você já tem acesso a todas as funcionalidades gratuitas!',
      });
      return;
    }

    if (!product.priceId) {
      console.error('Price ID não encontrado para o produto:', product.name);
      toast({
        title: 'Erro de Configuração',
        description: 'Não foi possível encontrar o ID de preço para este plano.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(product.priceId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: product.priceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/pricing`,
          mode: 'subscription',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar a sessão de checkout do Stripe.');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida do servidor.');
      }
    } catch (error: unknown) {
      console.error('Erro no checkout:', error);
      let errorMessage = 'Não foi possível iniciar o processo de pagamento.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Erro no Checkout',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Escolha seu Plano
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Encontre o plano perfeito para suas necessidades de gestão financeira familiar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {stripeProducts.map((product) => (
          <Card
            key={product.name}
            className={`relative flex flex-col overflow-hidden transition-all duration-300 hover:scale-105 ${
              product.isPopular
                ? 'border-primary shadow-lg bg-gradient-card'
                : 'bg-gradient-card shadow-card'
            }`}
          >
            {product.isPopular && (
              <Badge className="absolute top-4 right-4 bg-gradient-primary text-primary-foreground">
                Mais Popular
              </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto mb-4 rounded-full p-3 w-min ${
                  product.isPopular
                  ? 'bg-gradient-primary text-primary-foreground'
                  : product.mode === 'premium_interest'
                  ? 'bg-gradient-expense text-expense-foreground'
                  : 'bg-muted'
              }`}>
                <PlanIcon iconName={product.icon} className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {product.name}
              </CardTitle>
              <div className="text-3xl font-bold text-primary">
                {product.price}
                {product.mode === 'subscription' && (
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-grow space-y-6">
              <p className="text-muted-foreground text-center h-16">
                {product.description}
              </p>

              <ul className="space-y-3 flex-grow">
                {product.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-success flex-shrink-0 mt-1" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(product)}
                disabled={loading === product.priceId}
                className={`w-full mt-auto ${
                  product.isPopular
                    ? 'bg-gradient-primary text-primary-foreground shadow-button hover:scale-105'
                    : product.mode === 'premium_interest'
                    ? 'bg-gradient-expense text-expense-foreground shadow-expense hover:scale-105'
                    : 'bg-gradient-success text-success-foreground shadow-success hover:scale-105'
                } transition-smooth`}
              >
                {loading === product.priceId && product.mode === 'subscription' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  getButtonContent(product)
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <div className="bg-muted/50 rounded-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">
            Garantia de 30 dias
          </h3>
          <p className="text-muted-foreground">
            Experimente qualquer plano por 30 dias. Se não ficar satisfeito, 
            devolvemos seu dinheiro sem perguntas.
          </p>
        </div>
      </div>
    </div>
  );
};