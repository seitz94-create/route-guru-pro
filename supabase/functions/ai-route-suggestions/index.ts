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

    const systemPrompt = `You are an expert cycling route planner for Denmark. Generate personalized cycling route suggestions based on user preferences.
    
    Return a JSON array with exactly 3 route objects. Each route must have this exact structure:
    {
      "name": "Route name",
      "description": "Brief description of the route and what makes it special",
      "requestedDistance": number (the approximate desired distance in km),
      "difficulty": "Easy" | "Moderate" | "Hard" | "Expert",
      "highlights": ["Point 1", "Point 2", "Point 3"],
      "safetyNotes": "Important safety considerations",
      "startPoint": "Starting location name (must be a real city/town in Denmark)",
      "terrain": "road" | "gravel" | "mtb" | "mixed",
      "startCoords": {
        "lat": number (latitude),
        "lng": number (longitude)
      },
      "endCoords": {
        "lat": number (same as startCoords for loops),
        "lng": number (same as startCoords for loops)
      }
    }
    
    CRITICAL REQUIREMENTS:
    - ALL routes must be LOOP routes (endCoords = startCoords)
    - Use coordinates of REAL major Danish cities/towns with good cycling infrastructure
    - Popular cycling areas: Copenhagen (55.6761, 12.5683), Aarhus (56.1629, 10.2039), Odense (55.4038, 10.4024), Roskilde (55.6415, 12.0803)
    - Coordinates MUST be at city centers or well-known starting points with roads
    - Do NOT use coordinates in water, fields, or areas without roads
    
    Only return valid JSON array, no markdown formatting.`;

    const userPrompt = `Generate route suggestions for:
    Distance: ${preferences.distance}km
    Elevation: ${preferences.elevation}m
    Terrain: ${preferences.terrain}
    ${preferences.direction ? `Preferred direction: ${preferences.direction}` : ''}
    ${preferences.roadType ? `Road preference: ${preferences.roadType}` : ''}
    ${preferences.avoidTraffic ? 'Avoid high-traffic roads' : ''}
    
    User profile:
    Experience: ${userProfile?.experience_level || 'intermediate'}
    Discipline: ${userProfile?.cycling_discipline || 'road'}
    Location: ${userProfile?.location || 'not specified'}`;

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
    let suggestions = data.choices[0].message.content;
    
    // Clean up markdown formatting if present
    suggestions = suggestions.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON to validate it
    const aiRoutes = JSON.parse(suggestions);
    
    console.log('AI generated', aiRoutes.length, 'route concepts');

    // Generate actual routes using OpenRouteService for each AI suggestion
    const routePromises = aiRoutes.map(async (aiRoute: any) => {
      try {
        const routeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-cycling-route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            startCoords: aiRoute.startCoords,
            endCoords: aiRoute.endCoords,
            terrain: aiRoute.terrain
          })
        });

        if (!routeResponse.ok) {
          console.error('Failed to generate route for:', aiRoute.name);
          return null;
        }

        const routeData = await routeResponse.json();
        
        // Merge AI metadata with actual route data
        return {
          ...aiRoute,
          distance: parseFloat(routeData.distance),
          elevation: routeData.elevation,
          estimatedTime: `${Math.round(routeData.duration / 60)} timer`,
          path: routeData.path,
          coordinates: aiRoute.startCoords,
          gpxData: routeData.gpxData
        };
      } catch (error) {
        console.error('Error generating route:', error);
        return null;
      }
    });

    const generatedRoutes = await Promise.all(routePromises);
    const routes = generatedRoutes.filter(r => r !== null);
    
    console.log('Successfully generated', routes.length, 'complete routes');

    return new Response(JSON.stringify({ routes }), {
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
