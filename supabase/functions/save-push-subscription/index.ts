import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      throw new Error('Missing or invalid subscription object in request body.');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Manual Upsert Logic to avoid client-side onConflict parsing issue
    // 1. Check if subscription already exists
    const { data: existing, error: selectError } = await serviceClient
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('subscription->>endpoint', subscription.endpoint)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking for existing subscription:', selectError);
      throw selectError;
    }

    // 2. If it exists, do nothing. If not, insert it.
    if (existing) {
      console.log('Subscription already exists for this user and endpoint. No action taken.');
    } else {
      console.log('New subscription. Inserting into database.');
      const { error: insertError } = await serviceClient
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          subscription: subscription,
        });

      if (insertError) {
        console.error('Error inserting new subscription:', insertError);
        throw insertError;
      }
    }

    return new Response(JSON.stringify({ message: 'Subscription handled successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('General error in save-push-subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
