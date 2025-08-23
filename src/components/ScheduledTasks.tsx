import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Mail, Smartphone, Plus, Clock, CheckCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { supabase } from "@/integrations/supabase/client";

interface ScheduledTask {
  id: string;
  title: string;
  description?: string;
  task_type: 'payment_reminder' | 'budget_alert' | 'income_reminder' | 'custom';
  schedule_date: string;
  notification_email: boolean;
  notification_push: boolean;
  is_completed: boolean;
  created_at: string;
}

const taskTypes = [
  { value: 'payment_reminder', label: 'Lembrete de Pagamento' },
  { value: 'budget_alert', label: 'Alerta de Orçamento' },
  { value: 'income_reminder', label: 'Lembrete de Receita' },
  { value: 'custom', label: 'Personalizado' },
];

export const ScheduledTasks = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'custom' as const,
    schedule_date: '',
    schedule_time: '',
    notification_email: true,
    notification_push: true,
  });

  const { toast } = useToast();
  const { permission, requestPermission, scheduleNotification } = useNotifications();
  
  // Hook para verificar e enviar notificações automáticas
  useTaskNotifications();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .order('schedule_date', { ascending: true });

      if (error) throw error;
      setTasks((data || []) as ScheduledTask[]);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tarefas agendadas.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.schedule_date || !formData.schedule_time) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Verificar permissão de notificação se push estiver habilitado
    if (formData.notification_push && permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        toast({
          title: "Permissão negada",
          description: "Para receber notificações push, é necessário permitir as notificações no navegador.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const scheduleDateTime = `${formData.schedule_date}T${formData.schedule_time}:00`;
      
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .insert({
          title: formData.title,
          description: formData.description,
          task_type: formData.task_type,
          schedule_date: scheduleDateTime,
          notification_email: formData.notification_email,
          notification_push: formData.notification_push,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Agendar notificação push local
      if (formData.notification_push) {
        const scheduleTime = new Date(scheduleDateTime);
        scheduleNotification(formData.title, {
          body: formData.description,
          scheduleTime,
          icon: '/favicon.ico',
        });
      }

      toast({
        title: "Tarefa agendada",
        description: "Sua tarefa foi agendada com sucesso!",
      });

      // Reset form e recarregar lista
      setFormData({
        title: '',
        description: '',
        task_type: 'custom',
        schedule_date: '',
        schedule_time: '',
        notification_email: true,
        notification_push: true,
      });
      setIsFormOpen(false);
      loadTasks();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar a tarefa.",
        variant: "destructive",
      });
    }
  };

  const markAsCompleted = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({ is_completed: true })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Tarefa concluída",
        description: "A tarefa foi marcada como concluída.",
      });

      loadTasks();
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a tarefa como concluída.",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Tarefa removida",
        description: "A tarefa foi removida com sucesso.",
      });

      loadTasks();
    } catch (error) {
      console.error('Erro ao remover tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a tarefa.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Tarefas Agendadas
          </div>
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            size="sm"
            className="bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isFormOpen && (
          <Card className="bg-muted/50 border-muted">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Pagar conta de luz"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task_type">Tipo de Tarefa</Label>
                    <Select value={formData.task_type} onValueChange={(value: any) => setFormData({ ...formData, task_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Adicione detalhes sobre a tarefa..."
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule_date">Data *</Label>
                    <Input
                      id="schedule_date"
                      type="date"
                      value={formData.schedule_date}
                      onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule_time">Horário *</Label>
                    <Input
                      id="schedule_time"
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Notificações</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Email</span>
                      </div>
                      <Switch
                        checked={formData.notification_email}
                        onCheckedChange={(checked) => setFormData({ ...formData, notification_email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Notificação Push</span>
                      </div>
                      <Switch
                        checked={formData.notification_push}
                        onCheckedChange={(checked) => setFormData({ ...formData, notification_push: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-success text-success-foreground shadow-success hover:scale-105 transition-smooth"
                  >
                    Agendar Tarefa
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Tarefas */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma tarefa agendada ainda.</p>
              <p className="text-sm">Clique em "Nova Tarefa" para começar!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className={`border ${task.is_completed ? 'bg-muted/50 opacity-75' : 'bg-background'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge variant={task.is_completed ? 'secondary' : 'default'}>
                          {taskTypes.find(t => t.value === task.task_type)?.label}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.schedule_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.notification_email && <Mail className="h-3 w-3" />}
                          {task.notification_push && <Bell className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!task.is_completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsCompleted(task.id)}
                          className="h-8 px-3"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTask(task.id)}
                        className="h-8 px-3 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};