import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ScheduledTask {
  id: string;
  title: string;
  schedule_date: string;
  is_completed: boolean;
}

export const ScheduledTasks = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('id, title, schedule_date, is_completed')
        .eq('is_completed', false)
        .order('schedule_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setTasks((data || []) as ScheduledTask[]);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Próximas Tarefas
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/tasks">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa futura.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {new Date(task.schedule_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                        })}
                    </p>
                </div>
                <Badge variant="default">Pendente</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
