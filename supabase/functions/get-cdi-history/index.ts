import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CDIRequest {
    // last N days
    lastDays?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // The request body might be empty, so we need to handle that case
    let lastDays = 365 * 5; // default to 5 years
    try {
        const body = await req.json();
        if (body && body.lastDays) {
            lastDays = body.lastDays;
        }
    } catch (e) {
        // Ignore parsing error if body is empty
    }


    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/${lastDays}?formato=json`;

    const bcbResponse = await fetch(url);

    if (!bcbResponse.ok) {
      throw new Error('Failed to fetch CDI data from Bacen');
    }

    const bcbData = await bcbResponse.json();

    if (!Array.isArray(bcbData)) {
        throw new Error('Invalid data format from Bacen API');
    }

    // The CDI rate is daily, so we need to accumulate it to get an index
    let accumulatedCDI = 1.0;
    const timestamps: number[] = [];
    const prices: number[] = [];

    // Sort data by date, as the API doesn't guarantee order
    const sortedData = bcbData.sort((a, b) => {
        const [dayA, monthA, yearA] = a.data.split('/');
        const dateA = new Date(`${yearA}-${monthA}-${dayA}`).getTime();
        const [dayB, monthB, yearB] = b.data.split('/');
        const dateB = new Date(`${yearB}-${monthB}-${dayB}`).getTime();
        return dateA - dateB;
    });

    for (const record of sortedData) {
        const dailyRate = parseFloat(record.valor) / 100;
        accumulatedCDI *= (1 + dailyRate);

        const [day, month, year] = record.data.split('/');
        const date = new Date(`${year}-${month}-${day}`);

        timestamps.push(date.getTime());
        prices.push(accumulatedCDI);
    }

    return new Response(JSON.stringify({ timestamps, prices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-cdi-history:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
