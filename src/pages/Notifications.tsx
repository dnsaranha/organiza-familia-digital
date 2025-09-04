import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const Notifications = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Notificações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Alertas no App</CardTitle>
          <CardDescription>
            Configure os alertas que você recebe dentro do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="account-alerts">Alertas de Contas</Label>
            <Switch id="account-alerts" defaultChecked />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="due-date-alerts">Vencimentos Próximos</Label>
            <Switch id="due-date-alerts" defaultChecked />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="goal-alerts">Metas Atingidas</Label>
            <Switch id="goal-alerts" />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              toast.success('Esta é uma notificação de teste!', {
                description: 'Você receberá alertas como este.',
              })
            }
          >
            Mostrar Notificação de Teste
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Push (Web)</CardTitle>
          <CardDescription>
            Receba alertas no seu navegador mesmo com o app fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este recurso estará disponível em breve.
          </p>
          <Button disabled>Ativar Notificações Push</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
