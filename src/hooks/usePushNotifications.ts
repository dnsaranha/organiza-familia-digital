import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// Base64 to Uint8Array conversion for VAPID keys
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Temp public VAPID key - in production this should be from env
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8Gk-N5UYb-tKh4YWPiVtQ9MrxF8QXI11Y7Gf43YNH5QaQ8w5pJgYjVK0';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Check if push notifications are supported
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        await checkExistingSubscription();
      } else {
        console.log('Push notifications not supported');
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        console.log('Found existing push subscription');
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const subscribeToPush = async () => {
    if (!isSupported || !user) {
      toast({
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'É necessário permitir notificações para receber lembretes.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push service
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: JSON.stringify(pushSubscription.toJSON()),
          endpoint: pushSubscription.endpoint,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      
      toast({
        title: '✅ Notificações ativadas!',
        description: 'Você receberá lembretes das suas tarefas agendadas.',
      });

      console.log('Push subscription successful:', pushSubscription);
      return true;

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: 'Não foi possível ativar as notificações push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription || !user) return false;

    setIsLoading(true);

    try {
      // Unsubscribe from push service
      await subscription.unsubscribe();

      // Remove subscription from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setSubscription(null);
      setIsSubscribed(false);
      
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.',
      });

      return true;

    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Erro ao desativar notificações',
        description: 'Não foi possível desativar as notificações push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!isSubscribed || !user) return;

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🧪 Teste de Notificação',
          body: 'Esta é uma notificação de teste do Organiza!',
          icon: '/icons/icon-192x192.png',
        }
      });

      if (error) throw error;

      toast({
        title: 'Notificação enviada!',
        description: 'Você deve receber uma notificação em breve.',
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Erro ao enviar notificação',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
      });
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  };
};