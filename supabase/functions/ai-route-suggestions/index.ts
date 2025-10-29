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

    const systemPrompt = `You are an expert cycling route planner. Generate personalized cycling route suggestions based on user preferences.
    
    Return a JSON array with exactly 3 route objects. Each route must have this exact structure:
    {
      "name": "Route name",
      "description": "Brief description of the route and what makes it special",
      "distance": number (km),
      "elevation": number (m),
      "difficulty": "Easy" | "Moderate" | "Hard" | "Expert",
      "estimatedTime": "e.g., 2-3 hours",
      "highlights": ["Point 1", "Point 2", "Point 3"],
      "safetyNotes": "Important safety considerations",
      "startPoint": "Starting location name",
      "terrain": "road" | "gravel" | "mtb" | "mixed",
      "coordinates": {
        "lat": number (latitude, e.g., 55.6761 for Copenhagen),
        "lng": number (longitude, e.g., 12.5683 for Copenhagen)
      },
      "path": [
        {"lat": number, "lng": number},
        {"lat": number, "lng": number},
        ... (minimum 5-10 waypoints that create a realistic route path)
      ]
    }
    
    IMPORTANT: 
    - Include realistic GPS coordinates for the starting point of each route
    - Generate a complete route path with 5-10 waypoints that form a realistic cycling route
    - The path should start at the coordinates point and create a loop or out-and-back route
    - Make sure coordinates match the location and country mentioned in user profile or route description
    - Path waypoints should be spaced appropriately based on the total distance
    
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
    const routes = JSON.parse(suggestions);

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
