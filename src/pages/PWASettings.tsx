import { PWANotificationSettings } from '@/components/PWANotificationSettings';
import { usePWA } from '@/hooks/usePWA';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, Wifi, WifiOff } from 'lucide-react';

export const PWASettings = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Configurações PWA
          </h1>
          <p className="text-muted-foreground">
            Configure as funcionalidades do Progressive Web App
          </p>
        </div>

        <div className="space-y-6">
          {/* PWA Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Status do PWA
              </CardTitle>
              <CardDescription>
                Informações sobre a instalação e funcionalidades PWA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Status da Instalação</p>
                  <p className="text-sm text-muted-foreground">
                    {isInstalled ? 'App instalado no dispositivo' : 
                     isInstallable ? 'Pronto para instalação' : 
                     'Instalação não disponível'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isInstalled ? 'default' : isInstallable ? 'secondary' : 'outline'}>
                    {isInstalled ? 'Instalado' : 
                     isInstallable ? 'Disponível' : 
                     'Indisponível'}
                  </Badge>
                  {isInstallable && !isInstalled && (
                    <Button onClick={installApp} size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Instalar
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Service Worker</p>
                  <p className="text-sm text-muted-foreground">
                    {typeof navigator !== 'undefined' && 'serviceWorker' in navigator 
                      ? 'Suportado e ativo' 
                      : 'Não suportado'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Cache Offline</p>
                  <p className="text-sm text-muted-foreground">
                    Funcionalidade offline habilitada
                  </p>
                </div>
                <Badge variant="default">Ativo</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <PWANotificationSettings />

          {/* PWA Features */}
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades PWA</CardTitle>
              <CardDescription>
                Recursos disponíveis no Progressive Web App
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">✅ Funcionalidades Ativas</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Instalação no dispositivo</li>
                    <li>• Funcionamento offline básico</li>
                    <li>• Notificações locais</li>
                    <li>• Notificações push</li>
                    <li>• Ícones adaptativos</li>
                    <li>• Tela inicial personalizada</li>
                    <li>• Cache de recursos</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">🔄 Em Desenvolvimento</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Sincronização em background</li>
                    <li>• Share API</li>
                    <li>• Shortcuts dinâmicos</li>
                    <li>• Badge da aplicação</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Dicas de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Para melhor experiência:</p>
                  <ul className="text-muted-foreground mt-1 space-y-1">
                    <li>• Instale o app na tela inicial do seu dispositivo</li>
                    <li>• Permita notificações para receber lembretes</li>
                    <li>• Use o app mesmo offline - os dados serão sincronizados quando conectar</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-medium">Compatibilidade:</p>
                  <ul className="text-muted-foreground mt-1 space-y-1">
                    <li>• Chrome/Edge/Brave (Android): Suporte completo</li>
                    <li>• Safari (iOS): Funcionalidades básicas</li>
                    <li>• Firefox: Notificações e cache</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};