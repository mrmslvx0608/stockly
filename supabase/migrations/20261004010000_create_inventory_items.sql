-- Phase 3 only. Run once as postgres after the Phase 2 migration.
begin;

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null default 0,
  unit text not null default 'pcs',
  category text not null default 'Other',
  low_stock_threshold numeric(12,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_name_check check (
    char_length(name) between 1 and 200
    and name !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint inventory_items_quantity_check check (
    quantity >= 0 and quantity <> 'NaN'::numeric
  ),
  constraint inventory_items_unit_check check (
    char_length(unit) between 1 and 32
    and unit !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint inventory_items_category_check check (
    char_length(category) between 1 and 80
    and category !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint inventory_items_low_stock_threshold_check check (
    low_stock_threshold is null
    or (low_stock_threshold >= 0 and low_stock_threshold <> 'NaN'::numeric)
  )
);

create index inventory_items_household_id_idx
  on public.inventory_items (household_id);

create function private.set_inventory_item_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_inventory_item_updated_at()
  from public, anon, authenticated;

create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function private.set_inventory_item_updated_at();

alter table public.inventory_items enable row level security;

revoke all on table public.inventory_items from public, anon, authenticated;
grant select, delete on table public.inventory_items to authenticated;
grant insert (household_id, name, quantity, unit, category, low_stock_threshold)
  on public.inventory_items to authenticated;
grant update (name, quantity, unit, category, low_stock_threshold)
  on public.inventory_items to authenticated;

create policy inventory_items_select_for_members
  on public.inventory_items for select to authenticated
  using (private.is_household_member(household_id));

create policy inventory_items_insert_for_members
  on public.inventory_items for insert to authenticated
  with check (private.is_household_member(household_id));

create policy inventory_items_update_for_members
  on public.inventory_items for update to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));

create policy inventory_items_delete_for_members
  on public.inventory_items for delete to authenticated
  using (private.is_household_member(household_id));

commit;
