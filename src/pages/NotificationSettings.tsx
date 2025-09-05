import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NotificationSettingsPage = () => {
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
