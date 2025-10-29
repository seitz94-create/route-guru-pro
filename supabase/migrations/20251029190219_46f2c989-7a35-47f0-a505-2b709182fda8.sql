-- Create table to store Strava access tokens for users
CREATE TABLE public.strava_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  athlete_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own Strava connection
CREATE POLICY "Users can view their own Strava connection"
ON public.strava_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own Strava connection
CREATE POLICY "Users can insert their own Strava connection"
ON public.strava_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own Strava connection
CREATE POLICY "Users can update their own Strava connection"
ON public.strava_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own Strava connection
CREATE POLICY "Users can delete their own Strava connection"
ON public.strava_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_strava_connections_updated_at
BEFORE UPDATE ON public.strava_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();