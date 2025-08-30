import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { corsHeaders } from '../_shared/cors.ts';

// Supabase client with role key for elevated privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface NotificationPayload {
  title: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    // 2. Get user from token
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    ).auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    // 3. Get the user's OneSignal Player ID from the profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('onesignal_player_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.onesignal_player_id) {
      return new Response(JSON.stringify({ message: 'User does not have a OneSignal Player ID' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const playerId = profile.onesignal_player_id;

    // 4. Get the notification content from the request body
    const { title, description }: NotificationPayload = await req.json();

    // 5. Send notification using OneSignal API
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!oneSignalAppId || !oneSignalRestApiKey) {
        throw new Error('OneSignal credentials are not configured in environment variables.');
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestApiKey}`,
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_player_ids: [playerId],
        headings: { en: title },
        contents: { en: description || 'Você tem um novo lembrete.' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('OneSignal API Error:', errorBody);
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }

    const responseData = await response.json();

    return new Response(JSON.stringify({ success: true, oneSignalResponse: responseData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing notification:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
