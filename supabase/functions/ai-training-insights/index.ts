import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisType, message, userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Du er en ekspert cykel-træningscoach og personlig træningspartner. 
    
Din opgave er at:
- Give konkrete, handlingsorienterede råd
- Være venlig og motiverende
- Svare på dansk
- Bruge emojis hvor det giver mening
- Holde svar korte og præcise (max 150 ord)
- Fokusere på brugerens specifikke situation

Brugerdata: ${JSON.stringify(userData, null, 2)}`;
    
    let userPrompt = "";
    
    if (analysisType === 'chat') {
      userPrompt = message;
    } else if (analysisType === 'analyze') {
      userPrompt = `Analyser denne brugers træningsdata og giv indsigt i mønstre og fremskridt.`;
    } else if (analysisType === 'goals') {
      userPrompt = `Foreslå specifikke, opnåelige mål baseret på brugerens profil og træning.`;
    } else if (analysisType === 'nutrition') {
      userPrompt = `Giv ernæringsanbefalinger til denne cyklist baseret på deres træningsniveau.`;
    } else {
      throw new Error('Invalid analysis type');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        const errorMsg = response.status === 429 
          ? 'Rate limit exceeded. Please try again later.'
          : 'Credits exhausted. Please add credits to continue.';
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-training-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate insights';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
