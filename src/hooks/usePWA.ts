import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      } else if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
      } else if (document.referrer.includes('android-app://')) {
        setIsInstalled(true);
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      
      toast({
        title: '✅ App instalado!',
        description: 'O Organiza foi instalado com sucesso no seu dispositivo.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const installApp = async () => {
    if (!deferredPrompt) {
      toast({
        title: 'Instalação não disponível',
        description: 'A instalação do app não está disponível neste momento.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA: User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        toast({
          title: '🎉 Instalando app...',
          description: 'O Organiza está sendo instalado no seu dispositivo.',
        });
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA: Error installing app:', error);
      toast({
        title: 'Erro na instalação',
        description: 'Não foi possível instalar o app. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
  };
};