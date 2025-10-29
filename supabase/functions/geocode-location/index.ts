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

    // Add delay to respect Nominatim rate limits (1 request per second)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(1000);

    // Try geocoding with country code first
    let searchQuery = encodeURIComponent(location);
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=3&countrycodes=dk`,
      {
        headers: {
          'User-Agent': 'CyclingRouteApp/1.0',
          'Accept-Language': 'da,en'
        }
      }
    );

    let data = await response.json();
    console.log('Nominatim response with country filter:', data);
    
    // If no results with country filter, try without it
    if (!data || data.length === 0) {
      console.log('No results with DK filter, trying without country filter...');
      await delay(1000); // Respect rate limit
      
      response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=3`,
        {
          headers: {
            'User-Agent': 'CyclingRouteApp/1.0',
            'Accept-Language': 'da,en'
          }
        }
      );
      
      data = await response.json();
      console.log('Nominatim response without country filter:', data);
    }

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText);
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    if (!data || data.length === 0) {
      console.error('No geocoding results found for:', location);
      throw new Error(`Kunne ikke finde lokationen: ${location}. Prøv med en større by eller et mere specifikt stednavn.`);
    }

    const result = data[0];
    
    console.log('Geocoded successfully:', {
      name: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      type: result.type,
      importance: result.importance
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
