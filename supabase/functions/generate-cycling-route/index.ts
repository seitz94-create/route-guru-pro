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
    const { startCoords, endCoords, terrain, distance, elevation, direction, routeType, startLocation, endLocation } = await req.json();
    const OPENROUTESERVICE_API_KEY = Deno.env.get('OPENROUTESERVICE_API_KEY');
    
    if (!OPENROUTESERVICE_API_KEY) {
      throw new Error('OPENROUTESERVICE_API_KEY is not configured');
    }

    console.log('Generating route with:', { startCoords, endCoords, terrain, distance, direction, routeType, startLocation, endLocation });

    // Map terrain type to OpenRouteService profile
    const profileMap: Record<string, string> = {
      'road': 'cycling-road',
      'gravel': 'cycling-regular',
      'mtb': 'cycling-mountain',
      'mixed': 'cycling-regular'
    };
    
    const profile = profileMap[terrain] || 'cycling-regular';

    // Check if this is a loop route
    const isLoop = routeType === 'loop' || (startCoords.lat === endCoords.lat && startCoords.lng === endCoords.lng);
    
    let requestBody: any;
    
    if (isLoop) {
      // For loop routes, use round_trip with user's preferred distance
      const targetDistance = distance ? distance * 1000 : 50000; // Convert km to meters
      
      // Adjust route complexity based on elevation preference
      // Higher elevation preference = more waypoints = more varied/hilly route
      const points = elevation ? Math.min(Math.max(Math.floor(elevation / 200) + 3, 3), 10) : 3;
      
      requestBody = {
        coordinates: [[startCoords.lng, startCoords.lat]],
        options: {
          round_trip: {
            length: targetDistance,
            points: points,
            seed: Math.floor(Math.random() * 100)
          }
        },
        elevation: true,
        instructions: true
      };
      
      console.log(`Using ${points} waypoints for elevation preference: ${elevation}m`);
      
      // Add direction preference if specified
      if (direction && direction !== 'none') {
        const bearingMap: Record<string, number> = {
          'north': 0,
          'east': 90,
          'south': 180,
          'west': 270
        };
        if (bearingMap[direction.toLowerCase()]) {
          requestBody.options.round_trip.bearing = bearingMap[direction.toLowerCase()];
        }
      }
    } else {
      // For point-to-point routes
      requestBody = {
        coordinates: [
          [startCoords.lng, startCoords.lat],
          [endCoords.lng, endCoords.lat]
        ],
        elevation: true,
        instructions: true
      };
    }

    // Iteratively call OpenRouteService to better match requested distance/elevation (loops only)
    const maxAttempts = isLoop ? 3 : 1;
    let attempt = 0;
    let finalFeature: any = null;
    let finalSummary: any = null;
    let finalRequestBody: any = requestBody;

    while (attempt < maxAttempts) {
      const orsResponse = await fetch(
        `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json',
            'Authorization': OPENROUTESERVICE_API_KEY
          },
          body: JSON.stringify(finalRequestBody)
        }
      );

      if (!orsResponse.ok) {
        const errorText = await orsResponse.text();
        console.error('OpenRouteService error:', orsResponse.status, errorText);
        throw new Error(`OpenRouteService error: ${orsResponse.status}`);
      }

      const orsData = await orsResponse.json();
      console.log(`OpenRouteService response received (attempt ${attempt + 1}/${maxAttempts})`);

      if (!orsData.features || orsData.features.length === 0) {
        console.error('No route features returned');
        throw new Error('Could not generate route for these coordinates');
      }

      const feature = orsData.features[0];
      const summary = feature.properties.summary;

      const actualDistanceKmNum = (summary.distance / 1000);
      const ascentProp = feature.properties?.ascent;
      const ascentSummary = feature.properties?.summary?.ascent;
      const actualElevationNum = typeof ascentProp === 'number'
        ? ascentProp
        : (typeof ascentSummary === 'number' ? ascentSummary : null);

      // If loop, try to adjust length to better match requested distance
      if (isLoop && typeof distance === 'number' && distance > 0) {
        const diff = Math.abs(actualDistanceKmNum - distance) / distance;
        const elevationTooLow = typeof elevation === 'number' && elevation > 0 && actualElevationNum !== null && actualElevationNum < elevation * 0.6;

        if (diff > 0.15 || elevationTooLow) {
          // Adjust length proportionally towards the target distance
          if (diff > 0.15 && finalRequestBody?.options?.round_trip?.length) {
            const currentLength = finalRequestBody.options.round_trip.length;
            const factor = distance / actualDistanceKmNum;
            finalRequestBody.options.round_trip.length = Math.max(1000, Math.min(300000, Math.round(currentLength * factor)));
          }
          // Nudge points upward if we need more climbing
          if (elevationTooLow && finalRequestBody?.options?.round_trip?.points) {
            finalRequestBody.options.round_trip.points = Math.min(10, finalRequestBody.options.round_trip.points + 1);
          }
          // Change seed to explore a different loop
          if (finalRequestBody?.options?.round_trip) {
            finalRequestBody.options.round_trip.seed = Math.floor(Math.random() * 100);
          }

          attempt++;
          // Try again with adjusted parameters
          if (attempt < maxAttempts) continue;
        }
      }

      // Accept this route
      finalFeature = feature;
      finalSummary = summary;
      break;
    }

    if (!finalFeature || !finalSummary) {
      throw new Error('Failed to generate a suitable route');
    }

    // Convert GeoJSON coordinates to lat/lng format
    const coordinates = finalFeature.geometry.coordinates;
    const path = coordinates.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }));

    // Generate GPX using the final request body
    const gpxResponse = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}/gpx`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/gpx+xml',
          'Authorization': OPENROUTESERVICE_API_KEY
        },
        body: JSON.stringify(finalRequestBody)
      }
    );

    let gpxData = '';
    if (gpxResponse.ok) {
      gpxData = await gpxResponse.text();
      console.log('GPX data generated successfully');
    } else {
      console.warn('Could not generate GPX, but route succeeded');
    }

    const actualDistance = (finalSummary.distance / 1000).toFixed(1);
    const ascentPropFinal = finalFeature.properties?.ascent;
    const ascentSummaryFinal = finalFeature.properties?.summary?.ascent;
    const actualElevation = typeof ascentPropFinal === 'number'
      ? Math.round(ascentPropFinal)
      : (typeof ascentSummaryFinal === 'number' ? Math.round(ascentSummaryFinal) : null);

    console.log(`Route generated - Requested: ${distance}km/${elevation}m, Actual: ${actualDistance}km/${actualElevation ?? 'n/a'}m`);

    return new Response(
      JSON.stringify({
        path,
        distance: actualDistance,
        elevation: actualElevation,
        duration: Math.round(finalSummary.duration / 60),
        gpxData,
        requestedDistance: distance,
        requestedElevation: elevation
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
