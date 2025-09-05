import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Check, Banknote } from 'lucide-react';

const OpenFinanceConnectPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConnect = () => {
    setIsModalOpen(true);
    setIsLoading(true);
    setIsSuccess(false);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 3000);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Reset state after the modal is closed
     setTimeout(() => {
        setIsLoading(false);
        setIsSuccess(false);
    }, 300);
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center text-center space-y-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <Banknote className="h-16 w-16 text-primary" />
        <h1 className="text-3xl font-bold">Conecte suas Contas</h1>
        <p className="text-muted-foreground max-w-lg">
          Conecte suas contas de corretoras e bancos para uma visão financeira unificada e automática dos seus investimentos e transações.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Integração Open Finance</CardTitle>
          <CardDescription>
            Clique no botão abaixo para simular a conexão com sua corretora ou banco.
            Para esta demonstração, usaremos dados de exemplo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect} className="w-full">
            Conectar Corretora / Banco
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isLoading && 'Conectando com sua instituição...'}
              {isSuccess && 'Conexão Bem-sucedida!'}
            </DialogTitle>
            <DialogDescription>
              {isLoading && 'Isso pode levar alguns segundos. Por favor, não feche esta janela.'}
              {isSuccess && 'Seus dados foram sincronizados com sucesso.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-10">
            {isLoading && <Loader2 className="h-16 w-16 animate-spin text-primary" />}
            {isSuccess && (
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
