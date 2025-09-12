import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Tag, Users, Calendar, Info } from "lucide-react";

type Task = Tables<'tasks'> & { group: { name: string } | null };

interface TaskDetailsProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskDetails = ({ task, open, onOpenChange }: TaskDetailsProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <Badge variant={task.status === 'completed' ? "secondary" : "default"}>
              {task.status === 'completed' ? "Concluída" : "Pendente"}
            </Badge>
          </div>
          {task.description && <p className="text-muted-foreground">{task.description}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Agendada</p>
                <p>{task.scheduled_date ? new Date(task.scheduled_date).toLocaleString('pt-BR') : "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Criada em</p>
                <p>{new Date(task.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            {task.value && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Valor</p>
                  <p>{task.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            )}
            {task.category && (
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Categoria</p>
                  <p>{task.category}</p>
                </div>
              </div>
            )}
            {task.group && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Grupo</p>
                  <p>{task.group.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
