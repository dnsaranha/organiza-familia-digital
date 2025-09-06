import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";

export const useTaskNotifications = () => {
  const { sendNotification } = useNotifications();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkUpcomingTasks = async () => {
      try {
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        const { data: upcomingTasks, error } = await supabase
          .from("scheduled_tasks")
          .select("*")
          .eq("is_completed", false)
          .gte("schedule_date", now.toISOString())
          .lte("schedule_date", fiveMinutesFromNow.toISOString());

        if (error) {
          console.error("Erro ao buscar tarefas próximas:", error);
          return;
        }

        upcomingTasks?.forEach((task) => {
          const scheduleTime = new Date(task.schedule_date);
          const timeUntilTask = scheduleTime.getTime() - now.getTime();

          if (timeUntilTask > 0 && timeUntilTask <= 5 * 60 * 1000) {
            // 5 minutos
            if (task.notification_push) {
              sendNotification(`⏰ ${task.title}`, {
                body:
                  task.description || "Tarefa agendada próxima do vencimento",
                icon: "/favicon.ico",
              });
            }

            toast({
              title: `⏰ Lembrete: ${task.title}`,
              description:
                task.description || "Tarefa agendada próxima do vencimento",
            });

            // Enviar email se habilitado
            if (task.notification_email) {
              supabase.functions.invoke("send-notification", {
                body: {
                  taskId: task.id,
                  userEmail: user.email,
                  title: task.title,
                  description: task.description,
                  scheduleDate: task.schedule_date,
                },
              });
            }
          }
        });
      } catch (error) {
        // Silently handle network errors to avoid console spam
        if (
          error instanceof Error &&
          error.message.includes("Failed to fetch")
        ) {
          // Network error - likely offline or server unavailable
          return;
        }
        console.error("Erro ao verificar tarefas próximas:", error);
      }
    };

    // Verificar tarefas próximas a cada minuto
    const interval = setInterval(checkUpcomingTasks, 60 * 1000);

    // Verificar imediatamente
    checkUpcomingTasks();

    return () => clearInterval(interval);
  }, [sendNotification, toast, user]);
};
