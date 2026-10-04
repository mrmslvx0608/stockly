-- Phase 2 only. Run once as postgres in the Supabase SQL Editor.
-- No household or membership data is seeded by this migration.
begin;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  constraint household_members_role_check check (role in ('owner', 'member'))
);

create index household_members_user_id_idx
  on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Keep the privileged helper outside the Data API's exposed public schema.
create schema if not exists private;

create function private.is_household_member(household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members as membership
    where membership.household_id = $1
      and membership.user_id = (select auth.uid())
  );
$$;

-- postgres bypasses RLS, so this lookup cannot re-enter the membership policy.
-- The caller's identity still comes from auth.uid(), never a supplied user ID.
alter function private.is_household_member(uuid) owner to postgres;

revoke all on function private.is_household_member(uuid)
  from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;

-- Explicit grants work even when automatic exposure of new tables is disabled.
-- Remove any default client privileges before granting read access only.
revoke all on table public.households, public.household_members
  from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.households, public.household_members
  to authenticated;

create policy households_select_for_members
  on public.households
  for select
  to authenticated
  using (private.is_household_member(id));

create policy household_members_select_for_members
  on public.household_members
  for select
  to authenticated
  using (private.is_household_member(household_id));

-- No client INSERT, UPDATE, or DELETE policies. Membership remains admin-managed.
commit;
