# Phase 2: shared household setup

This is a manual, one-time setup in the existing Stockly Supabase project. No
hosted database changes have been executed by the local implementation.

## 1. Apply the migration

Open **SQL Editor**, use the **postgres** role, and paste the entire contents of
`supabase/migrations/20261004000000_create_shared_household_foundation.sql` into
a new query. Run it once. It creates empty tables, the helper, and read policies
in one transaction. It intentionally fails if either application table already
exists; inspect any conflict instead of dropping or replacing existing objects.

Keep **Automatically expose new tables** off. The migration grants SELECT only
on these two tables to `authenticated`. It assumes `public` is already an exposed
Data API schema. Keep `private` out of the exposed schemas; no settings changes
are needed for the standard Supabase configuration.

## 2. Create one household

Run this once as `postgres` and save the returned `id` as `<HOUSEHOLD_ID>`:

```sql
insert into public.households (name)
values ('Stockly household')
returning id, name, created_at;
```

Do not rerun this INSERT after success: it would create another household.

## 3. Obtain the two existing Auth user UUIDs

In **Authentication > Users**, copy the User UID for each existing user and
choose who will be the owner. Use `<USER_1_UUID>` for the owner and
`<USER_2_UUID>` for the member. Use two distinct existing UUIDs; do not create or
edit Auth users. An admin-only SQL Editor query can also list their IDs:

```sql
select id
from auth.users
order by created_at, id;
```

Keep the actual values in the SQL Editor; do not save them in repository files.
Replace every angle-bracket placeholder below with its actual UUID before running.

## 4. Add both users to the same household

Run as `postgres`. Both rows are inserted together; the foreign keys reject
unknown household or user IDs, and the primary key rejects duplicate memberships.

```sql
insert into public.household_members (household_id, user_id, role)
values
  ('<HOUSEHOLD_ID>'::uuid, '<USER_1_UUID>'::uuid, 'owner'),
  ('<HOUSEHOLD_ID>'::uuid, '<USER_2_UUID>'::uuid, 'member');
```

## 5. Verify the setup

As `postgres`, expect two rows sharing the household ID, one `owner` and one
`member`, with the chosen user IDs:

```sql
select h.id as household_id, h.name, m.user_id, m.role
from public.households as h
join public.household_members as m on m.household_id = h.id
where h.id = '<HOUSEHOLD_ID>'::uuid
order by m.role, m.user_id;
```

An admin query bypasses RLS. To check both users' read access, run this complete
transaction as `postgres`. Each user's two SELECTs should return the same one
household and both membership rows without a recursion error. The final SELECTs
with no user identity should return zero rows. ROLLBACK clears the test settings;
this transaction does not change any data or Auth users.

```sql
begin;
set local role authenticated;

select set_config('request.jwt.claim.sub', '<USER_1_UUID>', true);
select auth.uid() as acting_user;
select id, name from public.households;
select household_id, user_id, role from public.household_members;

select set_config('request.jwt.claim.sub', '<USER_2_UUID>', true);
select auth.uid() as acting_user;
select id, name from public.households;
select household_id, user_id, role from public.household_members;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select auth.uid() as acting_user;
select id, name from public.households;
select household_id, user_id, role from public.household_members;
rollback;
```

Both roles have identical read access. `owner` is only a stored role at this phase;
neither user can create, update, or delete households or memberships through the
client. The model permits additional households/members later; one household,
two members, and one owner are established by this manual bootstrap, not enforced
as global limits. No application grants, views, or RPCs expose `auth.users`.

The helper is `private.is_household_member(uuid)`: a `postgres`-owned
`SECURITY DEFINER` function with an empty search path and qualified references.
It bypasses RLS only for its membership lookup and checks the caller's
`auth.uid()`, returning a boolean. This prevents the membership SELECT policy
from recursively evaluating itself. Only `authenticated` receives client EXECUTE
permission; anonymous/public execution is revoked.

References: [Supabase RLS and recursion guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#avoid-recursive-policies)
and [PostgreSQL function security](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).
