import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsentRequest {
  permissions: string[];
  institutionId: string;
  redirectUri: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { permissions, institutionId, redirectUri }: ConsentRequest = await req.json();

    // Configurações do Open Banking
    const clientId = Deno.env.get('OPEN_BANKING_CLIENT_ID');
    const clientSecret = Deno.env.get('OPEN_BANKING_CLIENT_SECRET');
    const baseUrl = Deno.env.get('OPEN_BANKING_BASE_URL') || 'https://matls-auth.sandbox.directory.openbankingbrasil.org.br';

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Open Banking não configuradas');
    }

    // 1. Obter token de acesso para criar consentimento
    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'consents',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Falha na autenticação com Open Banking');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Criar consentimento
    const consentPayload = {
      data: {
        loggedUser: {
          document: {
            identification: '11111111111', // CPF do usuário (deve vir do contexto)
            rel: 'CPF'
          }
        },
        businessEntity: {
          document: {
            identification: institutionId,
            rel: 'CNPJ'
          }
        },
        permissions,
        expirationDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        transactionFromDateTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano atrás
        transactionToDateTime: new Date().toISOString(),
      }
    };

    const consentResponse = await fetch(`${baseUrl}/open-banking/consents/v2/consents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-fapi-interaction-id': crypto.randomUUID(),
      },
      body: JSON.stringify(consentPayload),
    });

    if (!consentResponse.ok) {
      const errorData = await consentResponse.text();
      console.error('Erro ao criar consentimento:', errorData);
      throw new Error('Falha ao criar consentimento');
    }

    const consentData = await consentResponse.json();
    const consentId = consentData.data.consentId;

    // 3. Gerar URL de autorização
    const authUrl = new URL(`${baseUrl}/auth`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'openid accounts');
    authUrl.searchParams.set('request', consentId);
    authUrl.searchParams.set('state', crypto.randomUUID());

    return new Response(
      JSON.stringify({
        consentId,
        consentUrl: authUrl.toString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro na função open-banking-consent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});