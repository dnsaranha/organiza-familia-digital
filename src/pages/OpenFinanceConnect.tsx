import { useState } from 'react';
import { useOpenBanking } from '@/hooks/useOpenBanking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Banknote, Building2, AlertCircle, Unlink } from 'lucide-react';
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
  
  const { toast } = useToast();

  const handleDisconnect = async () => {
    await disconnectBank();
  };

  const isLoading = bankLoading;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center text-center space-y-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <Banknote className="h-16 w-16 text-primary" />
        <h1 className="text-3xl font-bold">Conecte suas Contas</h1>
        <p className="text-muted-foreground max-w-lg">
          Conecte suas contas bancárias e de investimento via Pluggy para uma visão financeira unificada e automática.
        </p>
      </div>

      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">Conexões Bancárias (Pluggy)</CardTitle>
              </div>
              <Badge variant={bankConnected ? 'default' : 'secondary'}>
                {bankConnected ? `${accounts.length} conta(s) conectada(s)` : 'Não Conectado'}
              </Badge>
            </div>
            <CardDescription>
              {bankConnected 
                ? 'Suas contas conectadas via Pluggy. Você pode conectar mais contas a qualquer momento.'
                : 'Use a Pluggy para conectar suas contas bancárias e de investimento com segurança.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankConnected && accounts.length > 0 && (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div key={account.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{account.marketingName || account.name}</span>
                      <span className="text-xs text-muted-foreground">{account.type} • {account.subtype}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {account.balance.toLocaleString('pt-BR', { style: 'currency', currency: account.currency || 'BRL' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={initiateConnection}
                disabled={isLoading}
                className="flex-1"
              >
                {bankLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {bankConnected ? 'Conectar Nova Conta' : 'Conectar Primeira Conta'}
              </Button>
              
              {bankConnected && (
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar Todas
                </Button>
              )}
            </div>
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
