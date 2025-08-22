import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } else {
      // Fallback para toast se as notificações não estiverem disponíveis
      toast({
        title,
        description: options?.body,
      });
    }
  };

  const scheduleNotification = (
    title: string,
    options: NotificationOptions & { scheduleTime: Date }
  ) => {
    const { scheduleTime, ...notificationOptions } = options;
    const now = new Date();
    const delay = scheduleTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        sendNotification(title, notificationOptions);
      }, delay);
      
      return true;
    }
    
    return false;
  };

  return {
    permission,
    requestPermission,
    sendNotification,
    scheduleNotification,
    isSupported: 'Notification' in window,
  };
};