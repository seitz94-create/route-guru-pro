-- Create user relationships table for friends/following
CREATE TABLE public.user_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;

-- Users can view their own relationships
CREATE POLICY "Users can view their relationships"
ON public.user_relationships
FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can create their own follows
CREATE POLICY "Users can follow others"
ON public.user_relationships
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can unfollow"
ON public.user_relationships
FOR DELETE
USING (auth.uid() = follower_id);

-- Create challenges table
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  challenge_type text NOT NULL DEFAULT 'distance',
  target_value numeric NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  created_by uuid,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Everyone can view public challenges
CREATE POLICY "Public challenges are viewable by everyone"
ON public.challenges
FOR SELECT
USING (is_public = true OR auth.uid() = created_by);

-- Authenticated users can create challenges
CREATE POLICY "Users can create challenges"
ON public.challenges
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Create challenge participants table
CREATE TABLE public.challenge_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  progress numeric DEFAULT 0,
  completed boolean DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of public challenges
CREATE POLICY "View challenge participants"
ON public.challenge_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges 
    WHERE challenges.id = challenge_id 
    AND (challenges.is_public = true OR challenges.created_by = auth.uid())
  )
);

-- Users can join challenges
CREATE POLICY "Users can join challenges"
ON public.challenge_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their progress"
ON public.challenge_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Create route likes table
CREATE TABLE public.route_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(route_id, user_id)
);

ALTER TABLE public.route_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on public routes
CREATE POLICY "View route likes"
ON public.route_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.routes 
    WHERE routes.id = route_id 
    AND (routes.is_public = true OR routes.user_id = auth.uid())
  )
);

-- Users can like routes
CREATE POLICY "Users can like routes"
ON public.route_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike routes
CREATE POLICY "Users can unlike routes"
ON public.route_likes
FOR DELETE
USING (auth.uid() = user_id);