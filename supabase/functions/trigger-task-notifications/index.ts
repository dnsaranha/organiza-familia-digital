import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VITE_VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('VAPID keys are not configured. Push notifications will not be sent.');
} else {
  webpush.setVapidDetails(
    'mailto:your-email@example.com', // This should be a valid mailto: URL
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured on server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get tasks scheduled for the next 5 minutes
    const now = new Date();
    const future = new Date(now.getTime() + 5 * 60 * 1000);

    const { data: tasks, error: tasksError } = await serviceClient
      .from('scheduled_tasks')
      .select('id, title, user_id')
      .eq('is_completed', false)
      .eq('notification_push', true)
      .gte('schedule_date', now.toISOString())
      .lt('schedule_date', future.toISOString());

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      console.log('No tasks due for notification.');
      return new Response(JSON.stringify({ message: 'No tasks due.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each task
    for (const task of tasks) {
      const { data: subscriptions, error: subsError } = await serviceClient
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', task.user_id);

      if (subsError) {
        console.error(`Error fetching subscriptions for user ${task.user_id}:`, subsError);
        continue; // Skip to next task
      }

      const notificationPayload = JSON.stringify({
        title: `Lembrete de Tarefa: ${task.title}`,
        body: 'Sua tarefa está agendada para agora. Toque para ver os detalhes.',
        url: `/tasks` // URL to open on click
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload);
        } catch (error) {
          console.error('Error sending notification:', error);
          // If subscription is expired, remove it from the database
          if (error.statusCode === 410) {
            console.log('Subscription expired. Deleting from DB.');
            await serviceClient
              .from('push_subscriptions')
              .delete()
              .eq('user_id', task.user_id)
              .eq('subscription->>endpoint', sub.subscription.endpoint);
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${tasks.length} tasks.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('General error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
