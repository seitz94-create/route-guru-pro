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
    const { startCoords, endCoords, terrain, distance, elevation, direction, routeType, startLocation, endLocation, variant } = await req.json();
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
      
      // Map elevation preference to target meters per km and waypoints
      const elevationConfig: Record<string, { minPerKm: number, maxPerKm: number, points: number }> = {
        'flat': { minPerKm: 5, maxPerKm: 10, points: 3 },
        'hilly': { minPerKm: 10, maxPerKm: 15, points: 5 },
        'mountainous': { minPerKm: 15, maxPerKm: 25, points: 8 }
      };
      const config = elevationConfig[elevation as string] || elevationConfig['hilly'];
      
      requestBody = {
        coordinates: [[startCoords.lng, startCoords.lat]],
        options: {
          round_trip: {
            length: targetDistance,
            points: config.points,
            seed: variant ? variant * 100 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 100)
          }
        },
        elevation: true,
        instructions: true
      };
      
      console.log(`Targeting ${config.minPerKm}-${config.maxPerKm}m/km elevation for ${elevation} with ${config.points} waypoints (variant: ${variant || 'default'})`);
      
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

    // Iteratively call OpenRouteService to match both distance AND elevation level (loops only)
    const maxAttempts = isLoop ? 10 : 1;
    let attempt = 0;
    let finalFeature: any = null;
    let finalSummary: any = null;
    let finalRequestBody: any = requestBody;
    
    // Track best candidate by distance difference
    let bestFeature: any = null;
    let bestSummary: any = null;
    let bestRequestBody: any = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    
    // Get elevation targets for loop routes
    const elevationConfig: Record<string, { minPerKm: number, maxPerKm: number, points: number }> = {
      'flat': { minPerKm: 5, maxPerKm: 10, points: 3 },
      'hilly': { minPerKm: 10, maxPerKm: 15, points: 5 },
      'mountainous': { minPerKm: 15, maxPerKm: 25, points: 8 }
    };
    const targetConfig = elevationConfig[elevation as string] || elevationConfig['hilly'];

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

      // Calculate meters per km
      const actualMetersPerKm = actualElevationNum !== null ? actualElevationNum / actualDistanceKmNum : 0;

      // Update best candidate by distance difference
      if (isLoop && typeof distance === 'number' && distance > 0) {
        const distanceDiff = Math.abs(actualDistanceKmNum - distance) / distance;
        if (distanceDiff < bestDiff) {
          bestDiff = distanceDiff;
          bestFeature = feature;
          bestSummary = summary;
          bestRequestBody = JSON.parse(JSON.stringify(finalRequestBody));
        }
      }

      // Acceptance / adjustment logic
      if (isLoop && typeof distance === 'number' && distance > 0) {
        const distanceDiff = Math.abs(actualDistanceKmNum - distance) / distance;

        // If distance is within 5%, accept immediately (km is primary)
        if (distanceDiff <= 0.05) {
          finalFeature = feature;
          finalSummary = summary;
          break;
        }

        // If distance is off by more than 5%, adjust it aggressively
        if (distanceDiff > 0.05) {
          if (finalRequestBody?.options?.round_trip?.length) {
            const currentLength = finalRequestBody.options.round_trip.length;
            // Be more aggressive in the correction factor
            const factor = Math.pow(distance / actualDistanceKmNum, 1.2);
            finalRequestBody.options.round_trip.length = Math.max(1000, Math.min(300000, Math.round(currentLength * factor)));
          }
          console.log(`Distance off by ${(distanceDiff * 100).toFixed(1)}%, adjusting length aggressively`);
          attempt++;
          if (attempt < maxAttempts) continue;
        }
      }

      // Accept current route if no other conditions triggered
      finalFeature = feature;
      finalSummary = summary;
      break;
    }

    if (!finalFeature || !finalSummary) {
      if (bestFeature && bestSummary) {
        finalFeature = bestFeature;
        finalSummary = bestSummary;
        finalRequestBody = bestRequestBody || finalRequestBody;
      } else {
        throw new Error('Failed to generate a suitable route');
      }
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
