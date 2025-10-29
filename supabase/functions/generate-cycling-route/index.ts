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
    const { startCoords, endCoords, terrain } = await req.json();
    const OPENROUTESERVICE_API_KEY = Deno.env.get('OPENROUTESERVICE_API_KEY');
    
    if (!OPENROUTESERVICE_API_KEY) {
      throw new Error('OPENROUTESERVICE_API_KEY is not configured');
    }

    console.log('Generating route with:', { startCoords, endCoords, terrain });

    // Map terrain type to OpenRouteService profile
    const profileMap: Record<string, string> = {
      'road': 'cycling-road',
      'gravel': 'cycling-regular',
      'mtb': 'cycling-mountain',
      'mixed': 'cycling-regular'
    };
    
    const profile = profileMap[terrain] || 'cycling-regular';

    // Call OpenRouteService Directions API
    const orsResponse = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${OPENROUTESERVICE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        },
        body: JSON.stringify({
          coordinates: [
            [startCoords.lng, startCoords.lat],
            [endCoords.lng, endCoords.lat]
          ],
          format: 'geojson',
          elevation: true,
          extra_info: ['surface', 'waytype'],
          instructions: true
        })
      }
    );

    if (!orsResponse.ok) {
      const errorText = await orsResponse.text();
      console.error('OpenRouteService error:', orsResponse.status, errorText);
      throw new Error(`OpenRouteService error: ${orsResponse.status}`);
    }

    const orsData = await orsResponse.json();
    console.log('OpenRouteService response received');

    // Extract route data
    const feature = orsData.features[0];
    const coordinates = feature.geometry.coordinates;
    const summary = feature.properties.summary;
    
    // Convert GeoJSON coordinates to lat/lng format
    const path = coordinates.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0]
    }));

    // Generate GPX from GeoJSON
    const gpxResponse = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: {
          'Authorization': OPENROUTESERVICE_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/gpx+xml'
        },
        body: JSON.stringify({
          coordinates: [
            [startCoords.lng, startCoords.lat],
            [endCoords.lng, endCoords.lat]
          ],
          format: 'gpx',
          elevation: true
        })
      }
    );

    let gpxData = '';
    if (gpxResponse.ok) {
      gpxData = await gpxResponse.text();
      console.log('GPX data generated successfully');
    }

    return new Response(
      JSON.stringify({
        path,
        distance: (summary.distance / 1000).toFixed(1), // Convert to km
        elevation: Math.round(summary.ascent), // Elevation gain in meters
        duration: Math.round(summary.duration / 60), // Convert to minutes
        gpxData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-cycling-route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate route';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
