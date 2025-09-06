import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const PLUGGY_API_URL = 'https://api.pluggy.ai'
const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID')
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET')

async function getApiKey() {
  if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
    throw new Error('As variáveis de ambiente PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não estão configuradas.')
  }

  const authResponse = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    }),
  })

  if (!authResponse.ok) {
    const errorBody = await authResponse.text()
    throw new Error(`Erro de autenticação com a Pluggy: ${errorBody}`)
  }

  const { apiKey } = await authResponse.json()
  return apiKey
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { itemId } = await req.json()
    if (!itemId) {
      throw new Error('O `itemId` é obrigatório.')
    }

    const apiKey = await getApiKey()

    const accountsResponse = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    })

    if (!accountsResponse.ok) {
      const errorBody = await accountsResponse.text()
      throw new Error(`Erro ao buscar contas na Pluggy: ${errorBody}`)
    }

    const { results } = await accountsResponse.json()

    return new Response(JSON.stringify({ accounts: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função pluggy-accounts:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
