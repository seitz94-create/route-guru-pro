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
    const { preferences, userProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a geocoding and route planning assistant. Your job is to convert user location names to GPS coordinates.
    
    Return a JSON object with the following structure:
    {
      "startCoords": {
        "lat": number,
        "lng": number
      },
      "endCoords": {
        "lat": number,
        "lng": number
      },
      "startPointName": "Actual city/location name",
      "endPointName": "Actual city/location name"
    }
    
    CRITICAL REQUIREMENTS:
    - Convert the user's start and end location names to accurate GPS coordinates
    - Use real Danish cities/towns with good cycling infrastructure
    - Coordinates MUST be at city centers or well-known starting points with actual roads
    - Do NOT use coordinates in water, fields, or areas without roads
    - If user's location is vague, use the nearest major town
    - Common Danish cycling cities: København (55.6761, 12.5683), Aarhus (56.1629, 10.2039), Odense (55.4038, 10.4024), Roskilde (55.6415, 12.0803)
    
    Only return valid JSON, no markdown formatting.`;

    const isLoop = preferences.routeType === 'loop' || !preferences.endLocation;
    
    const userPrompt = `Convert these locations to GPS coordinates:
    Start location: ${preferences.startLocation}
    End location: ${isLoop ? preferences.startLocation : preferences.endLocation}
    
    These locations are in Denmark.`;

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
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;
    
    // Clean up markdown formatting if present
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse coordinates from AI
    const locationData = JSON.parse(aiResponse);
    
    console.log('AI geocoded locations:', locationData);

    // Call OpenRouteService to generate the actual route
    const routeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-cycling-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        startCoords: locationData.startCoords,
        endCoords: locationData.endCoords,
        terrain: preferences.terrain,
        distance: preferences.distance,
        elevation: preferences.elevation,
        direction: preferences.direction,
        routeType: preferences.routeType
      })
    });

    if (!routeResponse.ok) {
      const errorText = await routeResponse.text();
      console.error('Failed to generate route:', errorText);
      throw new Error('Could not generate route');
    }

    const routeData = await routeResponse.json();
    
    // Return single route with all data
    const route = {
      name: `${locationData.startPointName}${isLoop ? ' Loop' : ` til ${locationData.endPointName}`}`,
      description: `En ${preferences.terrain} rute på ca. ${preferences.distance}km${preferences.direction ? ` mod ${preferences.direction}` : ''}`,
      distance: parseFloat(routeData.distance),
      elevation: routeData.elevation,
      difficulty: preferences.distance < 30 ? 'Easy' : preferences.distance < 60 ? 'Moderate' : 'Hard',
      estimatedTime: `${Math.round(routeData.duration / 60)} timer`,
      highlights: routeData.highlights || [`Start: ${locationData.startPointName}`, `Distance: ${routeData.distance}km`, `Elevation: ${routeData.elevation}m`],
      safetyNotes: 'Vær opmærksom på trafik og vejrforhold',
      startPoint: locationData.startPointName,
      terrain: preferences.terrain,
      path: routeData.path,
      coordinates: locationData.startCoords,
      gpxData: routeData.gpxData
    };
    
    console.log('Successfully generated route');

    return new Response(JSON.stringify({ routes: [route] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-route-suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate route suggestions';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
