import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Plus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { TaskListItem } from "@/components/TaskListItem";
import { TaskForm } from "@/components/TaskForm";
import { TaskDetails } from "@/components/TaskDetails";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Task = Tables<'tasks'>;

const TasksPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [taskToView, setTaskToView] = useState<Task | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`*, group:family_groups(name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data as any);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Erro ao buscar tarefas",
        description: "Ocorreu um erro ao buscar as tarefas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    fetchTasks();
    setIsFormOpen(false);
    setSelectedTask(null);
    toast({
      title: "Tarefa salva!",
      description: "A tarefa foi salva com sucesso.",
    });
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleView = (task: Task) => {
    setTaskToView(task);
    setIsDetailsOpen(true);
  };

  const handleComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", is_completed: true })
        .eq("id", taskId);
      if (error) throw error;
      fetchTasks();
      toast({
        title: "Tarefa concluída!",
        description: "A tarefa foi marcada como concluída.",
      });
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Erro ao concluir tarefa",
        description: "Ocorreu um erro ao concluir a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      fetchTasks();
      toast({
        title: "Tarefa excluída!",
        description: "A tarefa foi excluída com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Erro ao excluir tarefa",
        description: "Ocorreu um erro ao excluir a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };


  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.category?.toLowerCase().includes(searchLower);

      const taskDate = new Date(task.scheduled_date!);
      const matchesDate =
        (!dateRange.from || new Date(task.scheduled_date!) >= dateRange.from) &&
        (!dateRange.to || new Date(task.scheduled_date!) <= dateRange.to);

      return matchesSearch && matchesDate;
    });
  }, [tasks, searchTerm, dateRange]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lista de Tarefas</h1>
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

      {loading ? (
        <div className="text-center">
            <p>Carregando tarefas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task as any}
              onComplete={handleComplete}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      )}

      <Button
        className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg"
        onClick={handleCreate}
      >
        <Plus className="w-8 h-8" />
      </Button>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={selectedTask}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {taskToView && (
        <TaskDetails
          task={taskToView as any}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </div>
  );
};

export default TasksPage;
