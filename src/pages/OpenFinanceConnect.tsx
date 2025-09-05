import { useState } from 'react';
import { useOpenBanking } from '@/hooks/useOpenBanking';
import { useB3Data } from '@/hooks/useB3Data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Banknote, Building2, TrendingUp, AlertCircle, Unlink } from 'lucide-react';
import { PluggyConnect } from 'react-pluggy-connect';
import { useToast } from '@/hooks/use-toast';

const OpenFinanceConnectPage = () => {
  const { 
    connected: bankConnected, 
    loading: bankLoading, 
    accounts,
    initiateConnection,
    disconnect: disconnectBank,
    handleSuccess,
    connectToken,
    setConnectToken
  } = useOpenBanking();
  
  const { 
    connected: b3Connected, 
    loading: b3Loading,
    portfolio,
    getPortfolio 
  } = useB3Data();

  const [selectedBroker, setSelectedBroker] = useState('');
  const { toast } = useToast();

  const institutions = [
    { id: 'clear', name: 'Clear Corretora', type: 'broker' },
    { id: 'rico', name: 'Rico Investimentos', type: 'broker' },
    { id: 'xp', name: 'XP Investimentos', type: 'broker' },
  ];

  const handleConnectBroker = () => {
    if (!selectedBroker) return;
    
    setTimeout(async () => {
      localStorage.setItem('connectedBrokerId', selectedBroker);
      localStorage.setItem('brokerAccessToken', 'mock-access-token-' + Date.now());
      await getPortfolio(selectedBroker, 'mock-access-token');
    }, 1000);
  };

  const handleDisconnect = async (type: 'bank' | 'broker') => {
    if (type === 'bank') {
      await disconnectBank();
    } else {
      localStorage.removeItem('connectedBrokerId');
      localStorage.removeItem('brokerAccessToken');
      window.location.reload();
    }
  };

  const isLoading = bankLoading || b3Loading;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center text-center space-y-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <Banknote className="h-16 w-16 text-primary" />
        <h1 className="text-3xl font-bold">Conecte suas Contas</h1>
        <p className="text-muted-foreground max-w-lg">
          Conecte suas contas bancárias e corretoras para uma visão financeira unificada e automática.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 w-full max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">Conexão Bancária (Pluggy)</CardTitle>
              </div>
              <Badge variant={bankConnected ? 'default' : 'secondary'}>
                {bankConnected ? 'Conectado' : 'Não Conectado'}
              </Badge>
            </div>
            <CardDescription>
              {bankConnected 
                ? `${accounts.length} conta(s) conectada(s).`
                : 'Use a Pluggy para conectar seu banco com segurança.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankConnected ? (
              <div className="space-y-2">
                {accounts.slice(0, 3).map((account) => (
                  <div key={account.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">{account.marketingName || account.name}</span>
                    <span className="text-sm font-medium">
                      {account.balance.toLocaleString('pt-BR', { style: 'currency', currency: account.currency })}
                    </span>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDisconnect('bank')}
                  className="w-full"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button
                onClick={initiateConnection}
                disabled={isLoading}
                className="w-full"
              >
                {bankLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Conectar Banco com Pluggy
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle className="text-lg">Conexão com Corretora</CardTitle>
              </div>
              <Badge variant={b3Connected ? 'default' : 'secondary'}>
                {b3Connected ? 'Conectado' : 'Não Conectado'}
              </Badge>
            </div>
            <CardDescription>
              {b3Connected 
                ? `Carteira com ${portfolio?.positions.length || 0} posições sincronizada`
                : 'Conecte sua corretora para ver sua carteira real'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {b3Connected && portfolio ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">Valor Total</span>
                  <span className="text-sm font-medium">
                    {portfolio.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDisconnect('broker')}
                  className="w-full"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar Corretora
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua corretora" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleConnectBroker} 
                  disabled={!selectedBroker || isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Conectar Corretora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Segurança e Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
           <div className="space-y-2">
              <h4 className="font-semibold">🔒 Criptografia de Ponta a Ponta</h4>
              <p className="text-sm text-muted-foreground">
                Todos os dados são criptografados durante a transmissão e armazenamento.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">🏛️ Conformidade Regulatória</h4>
              <p className="text-sm text-muted-foreground">
                Seguimos as diretrizes do Banco Central e LGPD.
              </p>
            </div>
        </CardContent>
      </Card>

      <Dialog open={!!connectToken} onOpenChange={(isOpen) => !isOpen && setConnectToken(null)}>
        <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conectar sua conta</DialogTitle>
            <DialogDescription>
              Siga as instruções para se conectar ao seu banco de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow">
            {connectToken && (
              <PluggyConnect
                connectToken={connectToken}
                onSuccess={handleSuccess}
                onError={(error) => {
                  console.error('Pluggy Connect Error:', error);
                  toast({
                    title: 'Erro na Conexão',
                    description: 'Ocorreu um erro ao conectar sua conta. Tente novamente.',
                    variant: 'destructive'
                  });
                  setConnectToken(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpenFinanceConnectPage;
