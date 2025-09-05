import { useState, useEffect } from 'react';
import { useOpenBanking } from '@/hooks/useOpenBanking';
import { useB3Data } from '@/hooks/useB3Data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, Banknote, Building2, TrendingUp, AlertCircle, Unlink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const OpenFinanceConnectPage = () => {
  const { 
    connected: bankConnected, 
    loading: bankLoading, 
    accounts,
    initiateConnection: connectBank,
    disconnect: disconnectBank 
  } = useOpenBanking();
  
  const { 
    connected: b3Connected, 
    loading: b3Loading,
    portfolio,
    getPortfolio 
  } = useB3Data();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [connectionType, setConnectionType] = useState<'bank' | 'broker' | null>(null);

  // Lista de instituições disponíveis (sandbox)
  const institutions = [
    { id: 'banco-do-brasil', name: 'Banco do Brasil', type: 'bank' },
    { id: 'bradesco', name: 'Bradesco', type: 'bank' },
    { id: 'itau', name: 'Itaú', type: 'bank' },
    { id: 'santander', name: 'Santander', type: 'bank' },
    { id: 'clear', name: 'Clear Corretora', type: 'broker' },
    { id: 'rico', name: 'Rico Investimentos', type: 'broker' },
    { id: 'xp', name: 'XP Investimentos', type: 'broker' },
  ];

  const handleConnectBank = async () => {
    if (!selectedInstitution) return;
    
    setIsModalOpen(true);
    setConnectionType('bank');
    
    try {
      await connectBank(selectedInstitution);
    } catch (error) {
      setIsModalOpen(false);
    }
  };

  const handleConnectBroker = () => {
    if (!selectedInstitution) return;
    
    setIsModalOpen(true);
    setConnectionType('broker');
    
    // Simular conexão com corretora
    setTimeout(async () => {
      const mockBrokerId = selectedInstitution;
      const mockAccessToken = 'mock-access-token-' + Date.now();
      
      localStorage.setItem('connectedBrokerId', mockBrokerId);
      localStorage.setItem('brokerAccessToken', mockAccessToken);
      
      await getPortfolio(mockBrokerId, mockAccessToken);
      setIsModalOpen(false);
    }, 2000);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setConnectionType(null);
  };

  const handleDisconnect = async (type: 'bank' | 'broker') => {
    if (type === 'bank') {
      await disconnectBank();
    } else {
      localStorage.removeItem('connectedBrokerId');
      localStorage.removeItem('brokerAccessToken');
      window.location.reload(); // Recarregar para limpar estado
    }
  };

  const isLoading = bankLoading || b3Loading;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center text-center space-y-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <Banknote className="h-16 w-16 text-primary" />
        <h1 className="text-3xl font-bold">Conecte suas Contas</h1>
        <p className="text-muted-foreground max-w-lg">
          Conecte suas contas bancárias e corretoras para uma visão financeira unificada e automática dos seus investimentos e transações.
        </p>
      </div>

      {/* Status das Conexões */}
      <div className="grid gap-4 md:grid-cols-2 w-full max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">Conexão Bancária</CardTitle>
              </div>
              <Badge variant={bankConnected ? 'default' : 'secondary'}>
                {bankConnected ? 'Conectado' : 'Não Conectado'}
              </Badge>
            </div>
            <CardDescription>
              {bankConnected 
                ? `${accounts.length} conta(s) conectada(s) via Open Banking`
                : 'Conecte seu banco para importar transações automaticamente'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bankConnected ? (
              <div className="space-y-2">
                {accounts.slice(0, 3).map((account, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">{account.brandName}</span>
                    <span className="text-sm font-medium">
                      {account.availableAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
              <div className="space-y-4">
                <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.filter(inst => inst.type === 'bank').map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleConnectBank} 
                  disabled={!selectedInstitution || isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Conectar Banco
                </Button>
              </div>
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
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">Rentabilidade</span>
                  <span className={`text-sm font-medium ${portfolio.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolio.totalGainLoss >= 0 ? '+' : ''}{portfolio.totalGainLossPercent.toFixed(2)}%
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDisconnect('broker')}
                  className="w-full"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua corretora" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.filter(inst => inst.type === 'broker').map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleConnectBroker} 
                  disabled={!selectedInstitution || isLoading}
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

      {/* Informações de Segurança */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Segurança e Privacidade
          </CardTitle>
          <CardDescription>
            Suas informações financeiras são protegidas pelos mais altos padrões de segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2">
              <h4 className="font-semibold">🔑 Acesso Controlado</h4>
              <p className="text-sm text-muted-foreground">
                Você controla quais dados compartilhar e pode revogar acesso a qualquer momento.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">📊 Apenas Leitura</h4>
              <p className="text-sm text-muted-foreground">
                Nunca realizamos transações - apenas consultamos seus dados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {(bankLoading || b3Loading) && `Conectando com ${connectionType === 'bank' ? 'banco' : 'corretora'}...`}
              {!bankLoading && !b3Loading && 'Conexão Bem-sucedida!'}
            </DialogTitle>
            <DialogDescription>
              {(bankLoading || b3Loading) && 'Isso pode levar alguns segundos. Por favor, não feche esta janela.'}
              {!bankLoading && !b3Loading && 'Seus dados foram sincronizados com sucesso.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-10">
            {(bankLoading || b3Loading) && <Loader2 className="h-16 w-16 animate-spin text-primary" />}
            {!bankLoading && !b3Loading && (
              <div className="flex flex-col items-center gap-4">
                 <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
                 </div>
                 <Button onClick={handleModalClose} className="mt-4">Fechar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpenFinanceConnectPage;
