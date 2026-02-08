-- ============================================
-- BurnBot AI — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- 1) Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text not null default 'SCRUB' check (tier in ('SCRUB', 'VILLAIN', 'CYBERLORD')),
  text_credits integer not null default 3,
  image_credits integer not null default 1,
  stripe_customer_id text,
  subscription_status text default 'inactive',
  credits_reset_at timestamptz default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Burn history table
create table if not exists public.burn_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('text', 'image')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Index for fast history lookups
create index if not exists idx_burn_history_user on public.burn_history(user_id, created_at desc);

-- 3) Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, tier, text_credits, image_credits)
  values (
    new.id,
    new.email,
    'SCRUB',
    3,
    1
  );
  return new;
end;
$$;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 5) Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.burn_history enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Burn history: users can CRUD their own history
create policy "Users can view own history"
  on public.burn_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.burn_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.burn_history for delete
  using (auth.uid() = user_id);

-- 6) Service role bypass (for Stripe webhooks updating tiers server-side)
-- The service_role key automatically bypasses RLS, so no extra policy needed.
