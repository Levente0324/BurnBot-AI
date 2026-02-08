-- ============================================
-- Migration: Lock down RLS policies (CRITICAL SECURITY FIX)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Replace with a restricted policy: users can ONLY update non-sensitive columns
-- They CANNOT update: tier, text_credits, image_credits, subscription_status,
-- stripe_customer_id, credits_reset_at (only the server with service_role can)
CREATE POLICY "Users can update own profile (restricted)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- This policy allows the update to proceed, but we restrict columns
    -- via a trigger that rejects changes to protected columns
  );

-- Trigger to prevent users from modifying protected columns via anon key
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the update is NOT from the service_role (i.e. from a regular user),
  -- prevent changes to sensitive columns
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    -- Keep protected columns unchanged
    NEW.tier := OLD.tier;
    NEW.text_credits := OLD.text_credits;
    NEW.image_credits := OLD.image_credits;
    NEW.subscription_status := OLD.subscription_status;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.credits_reset_at := OLD.credits_reset_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- Also add the atomic credit deduction RPC function for race condition safety
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id uuid, p_field text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.profiles;
BEGIN
  IF p_field NOT IN ('text_credits', 'image_credits') THEN
    RAISE EXCEPTION 'Invalid field: %', p_field;
  END IF;

  IF p_field = 'text_credits' THEN
    UPDATE public.profiles
    SET text_credits = text_credits - 1
    WHERE id = p_user_id AND text_credits > 0
    RETURNING * INTO result;
  ELSE
    UPDATE public.profiles
    SET image_credits = image_credits - 1
    WHERE id = p_user_id AND image_credits > 0
    RETURNING * INTO result;
  END IF;

  IF result IS NULL THEN
    RAISE EXCEPTION 'No credits remaining';
  END IF;

  RETURN result;
END;
$$;
