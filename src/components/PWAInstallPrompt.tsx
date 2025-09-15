import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(true);
  const { isInstallable, isInstalled, installApp } = usePWA();

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable || !showPrompt) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store in localStorage to not show again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if user dismissed recently (within 7 days)
  const dismissedAt = localStorage.getItem('pwa-install-dismissed');
  if (dismissedAt) {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (parseInt(dismissedAt) > weekAgo) {
      return null;
    }
  }

  return (
    <Card className="mb-6 border-primary bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Instalar Organiza</CardTitle>
              <CardDescription>
                Instale o app no seu dispositivo para uma experiência melhor
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Acesso rápido da tela inicial</li>
              <li>• Funciona offline</li>
              <li>• Notificações push</li>
              <li>• Experiência nativa</li>
            </ul>
          </div>
          <Button onClick={handleInstall} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Instalar App
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};