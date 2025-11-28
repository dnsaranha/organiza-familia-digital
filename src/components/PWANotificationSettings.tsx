'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Smartphone, Loader2 } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWANotificationSettings = () => {
  const { 
    isSupported,
    isSubscribed,
    isSubscriptionLoading,
    permission,
    subscribeToPush,
    unsubscribeFromPush,
    requestPermission, // Assuming usePWA will expose this
  } = usePWA();

  // A simple handler for the local notification permission switch
  const handlePermissionSwitch = async (checked: boolean) => {
    if (checked) {
      await requestPermission();
    }
    // Note: Browsers don't allow imperatively revoking permission.
    // The user must do it manually in the browser settings.
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador ou dispositivo não suporta notificações web.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* PWA Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba alertas importantes mesmo quando o aplicativo estiver fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <> 
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Ativar Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Status: {isSubscribed ? 'Inscrito' : 'Não Inscrito'}
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={isSubscribed}
                  onCheckedChange={(checked) => {
                    // Defer state update to prevent flushSync warning
                    setTimeout(() => {
                      if (checked) {
                        subscribeToPush();
                      } else {
                        unsubscribeFromPush();
                      }
                    }, 0);
                  }}
                  disabled={isSubscriptionLoading || permission === 'denied'}
                />
              </div>

              {permission === 'denied' && (
                <p className="text-sm text-red-500">
                  Você bloqueou as notificações. É necessário redefinir a permissão nas configurações do seu navegador.
                </p>
              )}
              
              {isSubscriptionLoading && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando sua inscrição...
                </div>
              )}
            </>
        </CardContent>
      </Card>

      {/* Notification Types (UI only for now) */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Configure quais tipos de notificação você deseja receber (funcionalidade em breve).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-reminders" className="text-muted-foreground">Lembretes de Tarefas</Label>
              <Switch id="task-reminders" disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="budget-alerts" className="text-muted-foreground">Alertas de Orçamento</Label>
              <Switch id="budget-alerts" disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="investment-updates" className="text-muted-foreground">Atualizações de Investimentos</Label>
              <Switch id="investment-updates" disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};