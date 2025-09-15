import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, TestTube, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotifications } from '@/hooks/useNotifications';

export const PWANotificationSettings = () => {
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    subscribeToPush, 
    unsubscribeFromPush, 
    sendTestNotification 
  } = usePushNotifications();
  
  const { 
    permission, 
    requestPermission, 
    sendNotification,
    isSupported: isNotificationSupported 
  } = useNotifications();

  const handleTestLocalNotification = () => {
    sendNotification('🧪 Teste de Notificação Local', {
      body: 'Esta é uma notificação local de teste do Organiza!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
    });
  };

  if (!isNotificationSupported && !isPushSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações. Tente usar um navegador mais recente.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Locais
          </CardTitle>
          <CardDescription>
            Notificações básicas do navegador para lembretes e alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="basic-notifications">Permitir Notificações</Label>
              <p className="text-sm text-muted-foreground">
                Status atual: {permission === 'granted' ? 'Permitido' : permission === 'denied' ? 'Negado' : 'Não solicitado'}
              </p>
            </div>
            <Switch
              id="basic-notifications"
              checked={permission === 'granted'}
              onCheckedChange={requestPermission}
              disabled={permission === 'denied'}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleTestLocalNotification}
              disabled={permission !== 'granted'}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Testar Notificação Local
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notificações Push (PWA)
          </CardTitle>
          <CardDescription>
            Notificações push avançadas para o app instalado (funciona mesmo com o app fechado)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPushSupported ? (
            <div className="text-sm text-muted-foreground">
              Notificações push não são suportadas neste navegador.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Ativar Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Status: {isPushSubscribed ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={isPushSubscribed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      subscribeToPush();
                    } else {
                      unsubscribeFromPush();
                    }
                  }}
                  disabled={isPushLoading}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={sendTestNotification}
                  disabled={!isPushSubscribed || isPushLoading}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar Push Notification
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Configure quais tipos de notificação você deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-reminders">Lembretes de Tarefas</Label>
              <Switch id="task-reminders" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="budget-alerts">Alertas de Orçamento</Label>
              <Switch id="budget-alerts" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="account-updates">Atualizações de Conta</Label>
              <Switch id="account-updates" />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="investment-updates">Atualizações de Investimentos</Label>
              <Switch id="investment-updates" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};