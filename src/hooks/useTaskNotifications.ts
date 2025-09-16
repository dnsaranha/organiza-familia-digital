import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";

export const useTaskNotifications = () => {
  const { sendNotification } = useNotifications();
  const { toast } = useToast();
  const { user } = useAuth();
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  // Update the task notification system to include PWA notifications
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

        upcomingTasks?.forEach(async (task) => {
          // Skip if we already notified about this task
          if (notifiedTasksRef.current.has(task.id)) {
            return;
          }

          const scheduleTime = new Date(task.schedule_date);
          const timeUntilTask = scheduleTime.getTime() - now.getTime();

          if (timeUntilTask > 0 && timeUntilTask <= 5 * 60 * 1000) {
            // Mark this task as notified to prevent duplicates
            notifiedTasksRef.current.add(task.id);
            
            // 5 minutos
            if (task.notification_push) {
              // Try PWA notification first
              if ('serviceWorker' in navigator) {
                try {
                  const registration = await navigator.serviceWorker.ready;
                  await registration.showNotification(`⏰ ${task.title}`, {
                    body: task.description || "Tarefa agendada próxima do vencimento",
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-96x96.png',
                    tag: `task-${task.id}`,
                    requireInteraction: false,
                    silent: false,
                  });
                } catch (error) {
                  console.log('PWA notification failed, falling back to basic notification');
                  // Fallback to basic notification
                  sendNotification(`⏰ ${task.title}`, {
                    body: task.description || "Tarefa agendada próxima do vencimento",
                    icon: "/icons/icon-192x192.png",
                  });
                }
              } else {
                // Fallback to basic notification
                sendNotification(`⏰ ${task.title}`, {
                  body: task.description || "Tarefa agendada próxima do vencimento",
                  icon: "/icons/icon-192x192.png",
                });
              }
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
        
        // Clean up notified tasks that are past their schedule time
        const pastTasks = new Set<string>();
        notifiedTasksRef.current.forEach(taskId => {
          // We could check the database, but for simplicity, we'll just clear old entries after a while
          // This prevents the Set from growing indefinitely
        });
        
        // Clear notifications older than 1 hour
        if (notifiedTasksRef.current.size > 50) {
          notifiedTasksRef.current.clear();
        }
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
