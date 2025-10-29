-- Add subscription plan field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN subscription_plan text DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'premium'));