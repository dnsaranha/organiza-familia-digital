import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccountsRequest {
  consentId: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { consentId }: AccountsRequest = await req.json();

    const clientId = Deno.env.get('OPEN_BANKING_CLIENT_ID');
    const clientSecret = Deno.env.get('OPEN_BANKING_CLIENT_SECRET');
    const baseUrl = Deno.env.get('OPEN_BANKING_BASE_URL') || 'https://matls-auth.sandbox.directory.openbankingbrasil.org.br';

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Open Banking não configuradas');
    }

    // 1. Obter token de acesso
    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'accounts',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Falha na autenticação');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Buscar contas
    const accountsResponse = await fetch(`${baseUrl}/open-banking/accounts/v2/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-fapi-interaction-id': crypto.randomUUID(),
        'consent-id': consentId,
      },
    });

    if (!accountsResponse.ok) {
      const errorData = await accountsResponse.text();
      console.error('Erro ao buscar contas:', errorData);
      throw new Error('Falha ao buscar contas');
    }

    const accountsData = await accountsResponse.json();

    return new Response(
      JSON.stringify({
        accounts: accountsData.data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro na função open-banking-accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});