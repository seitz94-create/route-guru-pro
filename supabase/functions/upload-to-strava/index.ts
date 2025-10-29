import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get user from auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { routeName, gpxData, description, distance, activityType = 'Ride' } = await req.json()

    if (!routeName || !gpxData) {
      throw new Error('Missing required fields')
    }

    console.log('Uploading route to Strava for user:', user.id)

    // Get user's Strava connection
    const { data: connection, error: connectionError } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      throw new Error('Strava not connected. Please connect your Strava account first.')
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token
    const expiresAt = new Date(connection.expires_at)
    const now = new Date()

    if (expiresAt <= now) {
      console.log('Access token expired, refreshing...')
      
      const clientId = Deno.env.get('STRAVA_CLIENT_ID')
      const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Strava token')
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token
      
      // Update stored tokens
      const newExpiresAt = new Date(refreshData.expires_at * 1000).toISOString()
      await supabase
        .from('strava_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiresAt,
        })
        .eq('user_id', user.id)

      console.log('Token refreshed successfully')
    }

    // Upload GPX to Strava
    const formData = new FormData()
    const gpxBlob = new Blob([gpxData], { type: 'application/gpx+xml' })
    formData.append('file', gpxBlob, 'route.gpx')
    formData.append('name', routeName)
    formData.append('description', description || `Uploaded from CycleAI - ${distance}km route`)
    formData.append('data_type', 'gpx')
    formData.append('activity_type', activityType)

    const uploadResponse = await fetch('https://www.strava.com/api/v3/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Strava upload failed:', errorText)
      throw new Error('Failed to upload to Strava')
    }

    const uploadData = await uploadResponse.json()
    console.log('Upload successful, upload ID:', uploadData.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        uploadId: uploadData.id,
        activityId: uploadData.activity_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in upload-to-strava:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
