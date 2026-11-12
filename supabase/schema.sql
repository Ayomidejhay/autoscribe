-- ============================================================================
-- AutoScribe: Production Supabase Schema, Auth Triggers & RLS Policies
-- Run this entire script in your Supabase SQL Editor
-- ============================================================================

-- 1. Profiles table (linked 1:1 with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text,
  role text check (role in ('client', 'freelancer')) not null default 'client',
  paypal_email text,
  github_username text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Projects table (Client initiates & invites Freelancer by email)
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  repo_url text,
  client_id uuid references public.profiles(id) on delete cascade not null,
  client_name text,
  client_email text not null,
  freelancer_id uuid references public.profiles(id) on delete set null,
  freelancer_name text,
  invited_freelancer_email text not null,
  freelancer_paypal_email text,
  invite_token text default gen_random_uuid()::text unique not null,
  invite_status text check (invite_status in ('pending_invite', 'accepted')) default 'pending_invite' not null,
  status text check (status in ('pending_invite', 'active', 'completed', 'disputed')) default 'pending_invite' not null,
  invite_accepted_at timestamp with time zone,
  total_budget numeric(10,2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Milestones table
create table if not exists public.milestones (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text not null,
  amount numeric(10,2) not null,
  status text check (status in ('pending', 'funded', 'submitted', 'verifying', 'verified', 'revision_requested', 'paid', 'disputed')) default 'pending' not null,
  release_mode text check (release_mode in ('autonomous', 'copilot')) default 'autonomous' not null,
  acceptance_criteria jsonb default '[]'::jsonb not null,
  github_commit_url text,
  preview_url text,
  ai_confidence_score integer,
  ai_review_notes text,
  plain_english_summary jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Escrow Transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete cascade not null,
  milestone_title text,
  paypal_order_id text,
  paypal_payout_batch_id text,
  recipient_paypal_email text,
  amount numeric(10,2) not null,
  type text check (type in ('deposit', 'payout', 'refund')) not null,
  status text not null default 'COMPLETED',
  raw_response jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Realtime AI Agent Verification Logs
create table if not exists public.agent_logs (
  id uuid default gen_random_uuid() primary key,
  milestone_id uuid references public.milestones(id) on delete cascade not null,
  step_type text check (step_type in ('TOOL_CALL', 'DIFF_ANALYSIS', 'SECURITY_SCAN', 'CRITERION_CHECK', 'DECISION', 'PAYPAL_PAYOUT')) not null,
  log_level text check (log_level in ('info', 'warning', 'security_alert', 'success')) not null default 'info',
  title text not null,
  message text not null,
  status text check (status in ('running', 'passed', 'failed', 'info')) default 'info',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- Trigger 1: Auto-create Profile when a user signs up via Supabase Auth
-- ============================================================================
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, paypal_email)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'paypal_email'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = coalesce(excluded.role, public.profiles.role),
    paypal_email = coalesce(excluded.paypal_email, public.profiles.paypal_email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ============================================================================
-- Trigger 2: Auto-bind pending Project Invites when Freelancer Profile upserts
-- ============================================================================
create or replace function public.link_invited_projects_on_profile_upsert()
returns trigger as $$
begin
  if new.role = 'freelancer' then
    update public.projects
    set
      freelancer_id = new.id,
      freelancer_name = coalesce(new.full_name, split_part(new.email, '@', 1)),
      freelancer_paypal_email = coalesce(new.paypal_email, public.projects.freelancer_paypal_email),
      invite_status = 'accepted',
      status = 'active',
      invite_accepted_at = timezone('utc'::text, now())
    where freelancer_id is null
      and lower(invited_freelancer_email) = lower(new.email);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_upsert_link_invites on public.profiles;
create trigger on_profile_upsert_link_invites
  after insert or update on public.profiles
  for each row execute procedure public.link_invited_projects_on_profile_upsert();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.transactions enable row level security;
alter table public.agent_logs enable row level security;

-- Profiles: Authenticated users can read profiles and upsert their own profile
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Projects: Strict isolation — only Client, bound Freelancer, or Invited Email can view
drop policy if exists "Participants can view attached projects only" on public.projects;
create policy "Participants can view attached projects only"
  on public.projects for select to authenticated
  using (
    auth.uid() = client_id
    or auth.uid() = freelancer_id
    or lower(invited_freelancer_email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "Authenticated clients can initiate projects" on public.projects;
create policy "Authenticated clients can initiate projects"
  on public.projects for insert to authenticated
  with check (auth.uid() = client_id);

drop policy if exists "Client or invited freelancer can update project" on public.projects;
create policy "Client or invited freelancer can update project"
  on public.projects for update to authenticated
  using (
    auth.uid() = client_id
    or auth.uid() = freelancer_id
    or lower(invited_freelancer_email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "Client can delete own projects" on public.projects;
create policy "Client can delete own projects"
  on public.projects for delete to authenticated
  using (auth.uid() = client_id);

-- Milestones: Inherit visibility from parent project
drop policy if exists "Project participants can view milestones" on public.milestones;
create policy "Project participants can view milestones"
  on public.milestones for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and (
          p.client_id = auth.uid()
          or p.freelancer_id = auth.uid()
          or lower(p.invited_freelancer_email) = lower(auth.jwt() ->> 'email')
        )
    )
  );

drop policy if exists "Project client can create milestones" on public.milestones;
create policy "Project client can create milestones"
  on public.milestones for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and p.client_id = auth.uid()
    )
  );

drop policy if exists "Project participants can update milestones" on public.milestones;
create policy "Project participants can update milestones"
  on public.milestones for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and (
          p.client_id = auth.uid()
          or p.freelancer_id = auth.uid()
          or lower(p.invited_freelancer_email) = lower(auth.jwt() ->> 'email')
        )
    )
  );

drop policy if exists "Project client can delete milestones" on public.milestones;
create policy "Project client can delete milestones"
  on public.milestones for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and p.client_id = auth.uid()
    )
  );

-- Transactions: Inherit visibility & insert access from parent project
drop policy if exists "Project participants can view transactions" on public.transactions;
create policy "Project participants can view transactions"
  on public.transactions for select to authenticated
  using (
    exists (
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = transactions.milestone_id
        and (
          p.client_id = auth.uid()
          or p.freelancer_id = auth.uid()
          or lower(p.invited_freelancer_email) = lower(auth.jwt() ->> 'email')
        )
    )
  );

drop policy if exists "Project participants can insert transactions" on public.transactions;
create policy "Project participants can insert transactions"
  on public.transactions for insert to authenticated
  with check (
    exists (
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = transactions.milestone_id
        and (
          p.client_id = auth.uid()
          or p.freelancer_id = auth.uid()
          or lower(p.invited_freelancer_email) = lower(auth.jwt() ->> 'email')
        )
    )
  );

-- Agent Logs: Inherit visibility & insert access from parent project
drop policy if exists "Project participants can view agent logs" on public.agent_logs;
create policy "Project participants can view agent logs"
  on public.agent_logs for select to authenticated
  using (
    exists (
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = agent_logs.milestone_id
        and (
          p.client_id = auth.uid()
          or p.freelancer_id = auth.uid()
          or lower(p.invited_freelancer_email) = lower(auth.jwt() ->> 'email')
        )
    )
  );

drop policy if exists "Project participants can insert agent logs" on public.agent_logs;
create policy "Project participants can insert agent logs"
  on public.agent_logs for insert to authenticated
  with check (
    exists (
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = agent_logs.milestone_id
        and (
          p.client_id = auth.uid()
          or p.freelancer_id = auth.uid()
          or lower(p.invited_freelancer_email) = lower(auth.jwt() ->> 'email')
        )
    )
  );
