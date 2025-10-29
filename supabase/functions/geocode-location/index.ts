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
    const { location } = await req.json();
    
    console.log('Geocoding location:', location);

    // Use Nominatim (OpenStreetMap) for geocoding - free and no API key required
    const searchQuery = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=1&countrycodes=dk`,
      {
        headers: {
          'User-Agent': 'CyclingRouteApp/1.0' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Location not found');
    }

    const result = data[0];
    
    console.log('Geocoded successfully:', {
      name: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    });

    return new Response(
      JSON.stringify({
        coords: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        displayName: result.display_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in geocode-location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to geocode location';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
