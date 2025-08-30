import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';
import { useToast } from './use-toast';

export const useTaskNotifications = () => {
  const { sendNotification } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    const checkUpcomingTasks = async () => {
      try {
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        const { data: upcomingTasks, error } = await supabase
          .from('scheduled_tasks')
          .select('*')
          .eq('is_completed', false)
          .gte('schedule_date', now.toISOString())
          .lte('schedule_date', fiveMinutesFromNow.toISOString());

        if (error) {
          console.error('Erro ao buscar tarefas próximas:', error);
          return;
        }

        upcomingTasks?.forEach((task) => {
          const scheduleTime = new Date(task.schedule_date);
          const timeUntilTask = scheduleTime.getTime() - now.getTime();
          
          if (timeUntilTask > 0 && timeUntilTask <= 5 * 60 * 1000) { // 5 minutos
            toast({
              title: `⏰ Lembrete: ${task.title}`,
              description: task.description || 'Tarefa agendada próxima do vencimento',
            });

            // Se as notificações push estiverem habilitadas, envie tanto a notificação do navegador
            // quanto a notificação push real através do backend.
            if (task.notification_push) {
              // Notificação no navegador (se a guia estiver aberta)
              sendNotification(`⏰ ${task.title}`, {
                body: task.description || 'Tarefa agendada próxima do vencimento',
                icon: '/favicon.ico',
              });

              // Notificação Push via OneSignal (funciona em segundo plano)
              supabase.functions.invoke('send-notification', {
                body: {
                  title: task.title,
                  description: task.description || 'Lembrete de tarefa.',
                },
              }).then(response => {
                if (response.error) {
                  console.error('Erro ao invocar send-notification:', response.error);
                }
              });
            }
          }
        });
      } catch (error) {
        console.error('Erro ao verificar tarefas próximas:', error);
      }
    };

    // Verificar tarefas próximas a cada minuto
    const interval = setInterval(checkUpcomingTasks, 60 * 1000);
    
    // Verificar imediatamente
    checkUpcomingTasks();

    return () => clearInterval(interval);
  }, [sendNotification, toast]);
};