import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const PLUGGY_API_URL = 'https://api.pluggy.ai';

// Remova o aviso sobre as credenciais após configurá-las no Supabase
const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID') ?? 'coloque-seu-client-id';
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET') ?? 'coloque-seu-client-secret';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obter a API Key da Pluggy
    const authResponse = await fetch(`${PLUGGY_API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Erro ao autenticar com a Pluggy: ${await authResponse.text()}`);
    }

    const { apiKey } = await authResponse.json();

    // 2. Criar o connect_token
    const connectTokenResponse = await fetch(`${PLUGGY_API_URL}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        // Você pode adicionar opções aqui, como 'update' para um item existente
      }),
    });

    if (!connectTokenResponse.ok) {
      throw new Error(`Erro ao criar o connect_token: ${await connectTokenResponse.text()}`);
    }

    const { accessToken } = await connectTokenResponse.json();

    return new Response(
      JSON.stringify({ accessToken }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
