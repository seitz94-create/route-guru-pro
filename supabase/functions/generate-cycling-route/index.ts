import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startCoords, endCoords, terrain, distance, elevation, direction, routeType, startLocation, endLocation, variant } = await req.json();
    const GRAPHHOPPER_API_KEY = Deno.env.get('GRAPHHOPPER_API_KEY');
    
    if (!GRAPHHOPPER_API_KEY) {
      throw new Error('GRAPHHOPPER_API_KEY is not configured');
    }

    console.log('Generating route with:', { startCoords, endCoords, terrain, distance, direction, routeType, startLocation, endLocation });

    // Map terrain type to GraphHopper vehicle profile
    const vehicleMap: Record<string, string> = {
      'road': 'racingbike',
      'gravel': 'bike',
      'mtb': 'mtb',
      'mixed': 'bike'
    };
    
    const vehicle = vehicleMap[terrain] || 'bike';

    // Check if this is a loop route
    const isLoop = routeType === 'loop' || (startCoords.lat === endCoords.lat && startCoords.lng === endCoords.lng);
    
    let routeParams: any = {
      key: GRAPHHOPPER_API_KEY,
      vehicle: vehicle,
      points_encoded: false,
      elevation: true,
      calc_points: true,
      instructions: false
    };
    
    if (isLoop) {
      // For loop routes, use round_trip algorithm
      const targetDistance = distance ? distance * 1000 : 50000; // Convert km to meters
      
      routeParams.point = `${startCoords.lat},${startCoords.lng}`;
      routeParams.algorithm = 'round_trip';
      routeParams['round_trip.distance'] = targetDistance;
      routeParams['round_trip.seed'] = variant ? variant * 100 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 100);
      
      console.log(`Generating round trip: ${distance}km from ${startCoords.lat},${startCoords.lng} (variant: ${variant || 'default'})`);
      
      // Add direction preference if specified (GraphHopper uses heading in degrees)
      if (direction && direction !== 'none') {
        const headingMap: Record<string, number> = {
          'north': 0,
          'east': 90,
          'south': 180,
          'west': 270
        };
        if (headingMap[direction.toLowerCase()]) {
          routeParams.heading = headingMap[direction.toLowerCase()];
        }
      }
    } else {
      // For point-to-point routes
      routeParams.point = [
        `${startCoords.lat},${startCoords.lng}`,
        `${endCoords.lat},${endCoords.lng}`
      ];
    }

    // Call GraphHopper API with iterative distance adjustments for loops
    const maxAttempts = isLoop ? 4 : 1;
    let attempt = 0;
    let finalRoute: any = null;
    let finalParams: any = { ...routeParams };
    
    // Track best candidate by distance difference
    let bestRoute: any = null;
    let bestParams: any = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    while (attempt < maxAttempts) {
      // Build URL with query parameters
      const url = new URL('https://graphhopper.com/api/1/route');
      Object.entries(finalParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.append(key, String(value));
        }
      });

      const ghResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!ghResponse.ok) {
        const errorText = await ghResponse.text();
        console.error('GraphHopper error:', ghResponse.status, errorText);
        if ((ghResponse.status === 429 || ghResponse.status === 500 || ghResponse.status === 503) && attempt < maxAttempts - 1) {
          console.log(`Transient GraphHopper error ${ghResponse.status}, retrying after short delay...`);
          attempt++;
          await sleep(400);
          continue;
        }
        throw new Error(`GraphHopper error: ${ghResponse.status}`);
      }

      const ghData = await ghResponse.json();
      console.log(`GraphHopper response received (attempt ${attempt + 1}/${maxAttempts})`);

      if (!ghData.paths || ghData.paths.length === 0) {
        console.error('No route paths returned');
        throw new Error('Could not generate route for these coordinates');
      }

      const route = ghData.paths[0];
      const actualDistanceKm = route.distance / 1000;
      const actualElevation = route.ascend || 0;

      // Update best candidate by distance difference
      if (isLoop && typeof distance === 'number' && distance > 0) {
        const distanceDiff = Math.abs(actualDistanceKm - distance) / distance;
        if (distanceDiff < bestDiff) {
          bestDiff = distanceDiff;
          bestRoute = route;
          bestParams = { ...finalParams };
        }
      }

      // Acceptance / adjustment logic for loops
      if (isLoop && typeof distance === 'number' && distance > 0) {
        const distanceDiff = Math.abs(actualDistanceKm - distance) / distance;

        // If distance is within 5%, accept immediately
        if (distanceDiff <= 0.05) {
          finalRoute = route;
          break;
        }

        // If distance is off by more than 5%, adjust it aggressively
        if (distanceDiff > 0.05) {
          const currentDistance = finalParams['round_trip.distance'];
          // Be more aggressive in the correction factor
          const factor = Math.pow(distance / actualDistanceKm, 1.2);
          finalParams['round_trip.distance'] = Math.max(1000, Math.min(300000, Math.round(currentDistance * factor)));
          console.log(`Distance off by ${(distanceDiff * 100).toFixed(1)}%, adjusting target distance`);
          attempt++;
          if (attempt < maxAttempts) continue;
        }
      }

      // Accept current route if no other conditions triggered
      finalRoute = route;
      break;
    }

    if (!finalRoute) {
      if (bestRoute) {
        finalRoute = bestRoute;
        finalParams = bestParams || finalParams;
      } else {
        throw new Error('Failed to generate a suitable route');
      }
    }

    // Convert GraphHopper points to lat/lng format
    const path = finalRoute.points.coordinates.map((coord: number[]) => ({ 
      lat: coord[1], 
      lng: coord[0] 
    }));

    // Generate GPX using GraphHopper
    const gpxUrl = new URL('https://graphhopper.com/api/1/route');
    Object.entries(finalParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => gpxUrl.searchParams.append(key, String(v)));
      } else {
        gpxUrl.searchParams.append(key, String(value));
      }
    });
    gpxUrl.searchParams.set('type', 'gpx');

    const gpxResponse = await fetch(gpxUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/gpx+xml'
      }
    });

    let gpxData = '';
    if (gpxResponse.ok) {
      gpxData = await gpxResponse.text();
      console.log('GPX data generated successfully');
    } else {
      console.warn('Could not generate GPX, but route succeeded');
    }

    const actualDistance = (finalRoute.distance / 1000).toFixed(1);
    const actualElevation = Math.round(finalRoute.ascend || 0);

    console.log(`Route generated - Requested: ${distance}km/${elevation}, Actual: ${actualDistance}km/${actualElevation}m`);

    return new Response(
      JSON.stringify({
        path,
        distance: actualDistance,
        elevation: actualElevation,
        duration: Math.round(finalRoute.time / 1000 / 60), // Convert ms to minutes
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
