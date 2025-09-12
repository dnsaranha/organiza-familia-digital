import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, Trash2, Clock, DollarSign, Tag, Users } from "lucide-react";

type Task = Tables<'tasks'> & { group: { name: string } | null };

interface TaskListItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onView: (task: Task) => void;
}

export const TaskListItem = ({ task, onComplete, onEdit, onDelete, onView }: TaskListItemProps) => {
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && task.scheduled_date && new Date(task.scheduled_date) < new Date();

  return (
    <Card className={`cursor-pointer hover:bg-muted/80 ${isCompleted ? "bg-muted/50 opacity-70" : "bg-background"}`} onClick={() => onView(task)}>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <div className="flex-1">
            <span className={`font-bold ${isCompleted ? "line-through" : ""}`}>{task.title}</span>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isCompleted ? "secondary" : isOverdue ? "destructive" : "default"}>
                {isCompleted ? "Concluída" : isOverdue ? "Atrasada" : "Pendente"}
              </Badge>
              {task.category && <Badge variant="outline">{task.category}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            {!isCompleted && (
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
              <Edit className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>
              <Trash2 className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {task.description && <p className="text-muted-foreground mb-4 truncate">{task.description}</p>}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{task.scheduled_date ? new Date(task.scheduled_date).toLocaleString('pt-BR') : "Sem data"}</span>
          </div>
          {task.value && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{task.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          )}
          {task.group && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{task.group.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
