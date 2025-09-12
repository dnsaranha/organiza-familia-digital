import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Mail, Smartphone, Plus, Clock, CheckCircle, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";

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
  group_id?: string;
  value?: number;
  category?: string;
}

interface FamilyGroup {
  id: string;
  name: string;
}

const taskTypes = [
  { value: 'payment_reminder', label: 'Lembrete de Pagamento' },
  { value: 'budget_alert', label: 'Alerta de Orçamento' },
  { value: 'income_reminder', label: 'Lembrete de Receita' },
  { value: 'custom', label: 'Personalizado' },
];

const TasksPage = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'custom' as const,
    schedule_date: '',
    schedule_time: '',
    notification_email: true,
    notification_push: true,
    group_id: 'personal',
    value: 0,
    category: '',
  });

  const { toast } = useToast();
  const { permission, requestPermission, scheduleNotification } = useNotifications();
  const { user } = useAuth();

  useTaskNotifications();

  useEffect(() => {
    if (user) {
      loadTasks();
      loadGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTask) {
      setFormData({
        title: selectedTask.title,
        description: selectedTask.description || '',
        task_type: selectedTask.task_type,
        schedule_date: new Date(selectedTask.schedule_date).toISOString().split('T')[0],
        schedule_time: new Date(selectedTask.schedule_date).toTimeString().slice(0, 5),
        notification_email: selectedTask.notification_email,
        notification_push: selectedTask.notification_push,
        group_id: selectedTask.group_id || 'personal',
        value: selectedTask.value || 0,
        category: selectedTask.category || '',
      });
    } else {
      resetForm();
    }
  }, [selectedTask]);

  const resetForm = () => {
    setFormData({
        title: '',
        description: '',
        task_type: 'custom' as const,
        schedule_date: '',
        schedule_time: '',
        notification_email: true,
        notification_push: true,
        group_id: 'personal',
        value: 0,
        category: '',
    });
  }

  const loadTasks = async () => {
    if (!user) return;

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

  const loadGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any).rpc('get_user_groups');

      if (error) throw error;
      setGroups((data || []) as FamilyGroup[]);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchLower = searchTerm.toLowerCase().split(' ');
      const matchesSearch = searchLower.every(word =>
        task.title.toLowerCase().includes(word) ||
        (task.description && task.description.toLowerCase().includes(word)) ||
        (task.category && task.category.toLowerCase().includes(word)) ||
        (task.value && task.value.toString().toLowerCase().includes(word))
      );

      const taskDate = new Date(task.schedule_date);
      const matchesDate =
        (!dateRange.from || taskDate >= dateRange.from) &&
        (!dateRange.to || taskDate <= dateRange.to);

      return matchesSearch && matchesDate;
    });
  }, [tasks, searchTerm, dateRange]);

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
      const localCreatedAt = new Date().toISOString();

      const taskData = {
          title: formData.title,
          description: formData.description,
          task_type: formData.task_type,
          schedule_date: scheduleDateTime,
          notification_email: formData.notification_email,
          notification_push: formData.notification_push,
          user_id: user?.id,
          group_id: formData.group_id === 'personal' ? null : formData.group_id,
          value: formData.value,
          category: formData.category,
          created_at: selectedTask ? selectedTask.created_at : localCreatedAt,
      };

      let error;
      if (selectedTask) {
          const { error: updateError } = await supabase
              .from('scheduled_tasks')
              .update(taskData)
              .eq('id', selectedTask.id);
          error = updateError;
      } else {
          const { error: insertError } = await supabase
              .from('scheduled_tasks')
              .insert(taskData)
              .select()
              .single();
          error = insertError;
      }

      if (error) throw error;

      if (formData.notification_push) {
        const scheduleTime = new Date(scheduleDateTime);
        scheduleNotification(formData.title, {
          body: formData.description,
          scheduleTime,
          icon: '/favicon.ico',
        });
      }

      toast({
        title: selectedTask ? "Tarefa atualizada" : "Tarefa agendada",
        description: `Sua tarefa "${formData.title}" foi salva com sucesso!`,
      });

      resetForm();
      setIsFormOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error('Erro ao criar/atualizar tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: ScheduledTask) => {
    setSelectedTask(task);
    setIsFormOpen(true);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tarefas Agendadas</h1>
        <Button
            onClick={() => {
                setSelectedTask(null);
                setIsFormOpen(true);
            }}
        >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar tarefas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <DateRangePicker
          onUpdate={({ range }) => setDateRange({ from: range.from, to: range.to as Date | undefined })}
        />
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa agendada ainda.</p>
            <p className="text-sm">Clique em "Nova Tarefa" para começar!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
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
                        {new Date(task.schedule_date).toLocaleString('pt-BR', {
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
                      onClick={() => handleEdit(task)}
                      className="h-8 px-3"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="value">Valor (R$)</Label>
                    <Input
                        id="value"
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                        placeholder="Ex: 150.50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Ex: Contas de casa"
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Compartilhar com Grupo (opcional)</Label>
              <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione um grupo ou deixe pessoal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Apenas pessoal</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {selectedTask ? 'Salvar Alterações' : 'Agendar Tarefa'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;