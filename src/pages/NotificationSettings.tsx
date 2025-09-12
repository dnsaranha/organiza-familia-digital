import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationSettingsPage = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  const getSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    setIsSubscribed(!!sub);
    setSubscription(sub);
  }, []);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      console.error("VAPID public key not found. Notifications will not work.");
      toast.error("Configuração de notificação ausente no servidor.");
    }
    getSubscription();
  }, [getSubscription, VAPID_PUBLIC_KEY]);

  const handleSubscriptionChange = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Não é possível se inscrever para notificações.", {
        description: "A chave de notificação do aplicativo não está configurada.",
      });
      return;
    }

    setIsSubscribing(true);

    if (isSubscribed) {
      // Unsubscribe
      if (subscription) {
        await subscription.unsubscribe();
        const { error } = await supabase.functions.invoke('delete-push-subscription', { body: { endpoint: subscription.endpoint } });
        if (error) {
          // If the backend call fails, the user might still be subscribed in the DB.
          // We proceed to update the UI, but log the error.
          console.error("Failed to delete subscription from backend:", error);
          toast.error("Falha ao remover inscrição do servidor. Tente novamente.");
        }
        setSubscription(null);
        setIsSubscribed(false);
        toast.success("Inscrição de notificações removida.");
      }
    } else {
      // Subscribe
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.warning("Permissão para notificações não concedida.");
        setIsSubscribing(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const { error } = await supabase.functions.invoke('save-push-subscription', { body: { subscription: newSubscription } });
        if (error) throw error;

        setSubscription(newSubscription);
        setIsSubscribed(true);
        toast.success("Inscrito para notificações com sucesso!");
      } catch (error) {
        console.error("Failed to subscribe:", error);
        toast.error("Falha ao se inscrever para notificações.");
      }
    }

    setIsSubscribing(false);
  };

  const handleTestNotification = () => {
    toast.success("Esta é uma notificação de teste!", {
      description: "O sistema de notificações está funcionando.",
      duration: 5000,
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurar Notificações</h1>
        <p className="text-muted-foreground">Gerencie como você recebe alertas e atualizações.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Contas</CardTitle>
          <CardDescription>Receba alertas sobre suas contas e transações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="account-updates" className="flex flex-col space-y-1">
              <span>Atualizações de Saldo</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Receber notificações sobre mudanças no saldo de suas contas.
              </span>
            </Label>
            <Switch id="account-updates" defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="large-transactions" className="flex flex-col space-y-1">
              <span>Transações Elevadas</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Ser notificado sobre transações acima de um determinado valor.
              </span>
            </Label>
            <Switch id="large-transactions" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Vencimentos</CardTitle>
          <CardDescription>Lembretes sobre contas a pagar e faturas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="due-dates" className="flex flex-col space-y-1">
              <span>Próximo ao Vencimento</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Receber lembretes 3 dias antes do vencimento de uma conta.
              </span>
            </Label>
            <Switch id="due-dates" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Push</CardTitle>
          <CardDescription>Receba notificações diretamente no seu dispositivo, mesmo com o app fechado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
              <span>Ativar Notificações Push</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Receber alertas de tarefas e outras atualizações importantes.
              </span>
            </Label>
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleSubscriptionChange}
              disabled={isSubscribing || !VAPID_PUBLIC_KEY}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testar Notificações</CardTitle>
          <CardDescription>Clique no botão para enviar uma notificação de teste.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestNotification}>Enviar Notificação de Teste</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettingsPage;
