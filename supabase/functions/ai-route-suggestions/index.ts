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

    const isLoop = preferences.routeType === 'loop' || !preferences.endLocation;
    
    console.log('Geocoding start location:', preferences.startLocation);

    // Geocode start location using Nominatim
    const startGeoResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/geocode-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        location: preferences.startLocation
      })
    });

    if (!startGeoResponse.ok) {
      throw new Error('Could not find start location');
    }

    const startGeoData = await startGeoResponse.json();
    console.log('Start location geocoded:', startGeoData);

    let endGeoData = startGeoData; // Default to same as start for loops

    // Geocode end location if point-to-point
    if (!isLoop && preferences.endLocation) {
      console.log('Geocoding end location:', preferences.endLocation);
      
      const endGeoResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/geocode-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({
          location: preferences.endLocation
        })
      });

      if (!endGeoResponse.ok) {
        throw new Error('Could not find end location');
      }

      endGeoData = await endGeoResponse.json();
      console.log('End location geocoded:', endGeoData);
    }

    // Call OpenRouteService to generate the actual route
    const routeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-cycling-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        startCoords: startGeoData.coords,
        endCoords: endGeoData.coords,
        terrain: preferences.terrain,
        distance: preferences.distance,
        elevation: preferences.elevation,
        direction: preferences.direction,
        routeType: preferences.routeType,
        startLocation: preferences.startLocation,
        endLocation: preferences.endLocation
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
      name: `${preferences.startLocation}${isLoop ? ' Loop' : ` til ${preferences.endLocation}`}`,
      description: `En ${preferences.terrain} rute på ca. ${preferences.distance}km${preferences.direction && preferences.direction !== 'none' ? ` mod ${preferences.direction}` : ''}`,
      distance: parseFloat(routeData.distance),
      elevation: routeData.elevation,
      difficulty: preferences.distance < 30 ? 'Easy' : preferences.distance < 60 ? 'Moderate' : 'Hard',
      estimatedTime: `${Math.round(routeData.duration / 60)} timer`,
      highlights: routeData.highlights || [`Start: ${startGeoData.displayName}`, `Distance: ${routeData.distance}km`, `Elevation: ${routeData.elevation}m`],
      safetyNotes: 'Vær opmærksom på trafik og vejrforhold',
      startPoint: startGeoData.displayName,
      terrain: preferences.terrain,
      path: routeData.path,
      coordinates: startGeoData.coords,
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
