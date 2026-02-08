-- ============================================
-- Migration: Add credits_reset_at column
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- Add the credits_reset_at column to track monthly renewal dates
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz DEFAULT NULL;

-- Update the new-user trigger to use the new free tier defaults (3 text, 1 image)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier, text_credits, image_credits)
  VALUES (
    new.id,
    new.email,
    'SCRUB',
    3,
    1
  );
  RETURN new;
END;
$$;
