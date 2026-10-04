-- Phase 4 only. Run once as postgres after the completed Phase 2/3 migrations.
begin;

-- Derive ownership without granting clients INSERT on household_id.
-- Like the application resolver, this requires exactly one membership.
create function private.shopping_household_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  household_ids uuid[];
begin
  select array_agg(m.household_id) into household_ids
  from public.household_members as m
  where m.user_id = (select auth.uid());

  if coalesce(cardinality(household_ids), 0) <> 1 then
    raise exception 'Exactly one household membership is required.' using errcode = '42501';
  end if;
  return household_ids[1];
end;
$$;

revoke all on function private.shopping_household_id() from public, anon, authenticated;
grant execute on function private.shopping_household_id() to authenticated;

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.shopping_household_id()
    references public.households(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  name text not null,
  category text not null default 'Other',
  quantity numeric(12,3) not null,
  unit text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_items_name_check check (
    char_length(name) between 1 and 200
    and name !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint shopping_items_category_check check (
    char_length(category) between 1 and 80
    and category !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint shopping_items_quantity_check check (
    quantity > 0 and quantity <> 'NaN'::numeric
  ),
  constraint shopping_items_unit_check check (
    char_length(unit) between 1 and 32
    and unit !~ '^[[:space:]]|[[:space:]]$'
  )
);

create index shopping_items_household_id_idx on public.shopping_items (household_id);
create index shopping_items_inventory_item_id_idx on public.shopping_items (inventory_item_id)
  where inventory_item_id is not null;

create function private.set_shopping_item_updated_at()
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

revoke all on function private.set_shopping_item_updated_at() from public, anon, authenticated;

create trigger shopping_items_set_updated_at
  before update on public.shopping_items
  for each row execute function private.set_shopping_item_updated_at();

alter table public.shopping_items enable row level security;

revoke all on table public.shopping_items from public, anon, authenticated;
grant select, delete on table public.shopping_items to authenticated;
grant insert (inventory_item_id, name, category, quantity, unit)
  on public.shopping_items to authenticated;
grant update (inventory_item_id, name, category, quantity, unit)
  on public.shopping_items to authenticated;

create policy shopping_items_select_for_members
  on public.shopping_items for select to authenticated
  using (private.is_household_member(household_id));

create policy shopping_items_insert_for_members
  on public.shopping_items for insert to authenticated
  with check (
    private.is_household_member(household_id)
    and completed_at is null
    and (inventory_item_id is null or exists (
      select 1 from public.inventory_items as inventory
      where inventory.id = shopping_items.inventory_item_id
        and inventory.household_id = shopping_items.household_id
        and inventory.unit = shopping_items.unit
    ))
  );

create policy shopping_items_update_for_members
  on public.shopping_items for update to authenticated
  using (private.is_household_member(household_id) and completed_at is null)
  with check (
    private.is_household_member(household_id)
    and completed_at is null
    and (inventory_item_id is null or exists (
      select 1 from public.inventory_items as inventory
      where inventory.id = shopping_items.inventory_item_id
        and inventory.household_id = shopping_items.household_id
        and inventory.unit = shopping_items.unit
    ))
  );

create policy shopping_items_delete_for_members
  on public.shopping_items for delete to authenticated
  using (private.is_household_member(household_id));

-- Completion is available only here: clients have no completed_at write grant.
create function public.purchase_shopping_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  shopping public.shopping_items%rowtype;
  inventory public.inventory_items%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to purchase shopping items.' using errcode = '42501';
  end if;

  -- Filter membership before acquiring the lock; never lock a foreign item.
  select s.* into shopping
  from public.shopping_items as s
  where s.id = p_item_id and private.is_household_member(s.household_id)
  for update;

  if not found or not private.is_household_member(shopping.household_id) then
    raise exception 'Shopping item is unavailable.' using errcode = '42501';
  end if;
  if shopping.completed_at is not null then
    raise exception 'This shopping item has already been purchased.' using errcode = 'P0001';
  end if;

  if shopping.inventory_item_id is not null then
    select i.* into inventory
    from public.inventory_items as i
    where i.id = shopping.inventory_item_id and i.household_id = shopping.household_id
    for update;

    if not found then
      raise exception 'Linked inventory item is unavailable.' using errcode = 'P0001';
    end if;
    if inventory.unit <> shopping.unit then
      raise exception 'Linked inventory unit has changed. Edit the shopping item before purchasing.' using errcode = 'P0001';
    end if;
    if inventory.quantity + shopping.quantity > 999999999.999 then
      raise exception 'Purchase would exceed the maximum inventory quantity.' using errcode = 'P0001';
    end if;

    update public.inventory_items
    set quantity = quantity + shopping.quantity
    where id = inventory.id and household_id = shopping.household_id;
  end if;

  update public.shopping_items
  set completed_at = now()
  where id = shopping.id and household_id = shopping.household_id;

  -- The application uses this trusted result to revalidate Inventory when linked.
  return shopping.inventory_item_id is not null;
end;
$$;

alter function public.purchase_shopping_item(uuid) owner to postgres;
revoke all on function public.purchase_shopping_item(uuid) from public, anon, authenticated;
grant execute on function public.purchase_shopping_item(uuid) to authenticated;

commit;
