# Phase 2: shared household setup

This is a manual, one-time setup in the existing Stockly Supabase project. No
hosted database changes have been executed by the local implementation.

**Status: COMPLETE.** The user confirmed the Phase 2 migration, bootstrap, and
both users' runtime RLS checks. The following steps are retained as a setup
reference; do not rerun the completed migration or bootstrap in the existing
project. Phase 3 Inventory is also complete; its verified results are below.

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

---

# Phase 3: shared household inventory — COMPLETE

The user confirmed the hosted migration and manual application, validation,
trigger, and runtime RLS checks on **4 October 2026**. Hosted SQL was executed
manually by the user, not by the local implementation agent. Phase 1
Authentication and Phase 2 Shared Household remain working and unchanged.

## 1. Inventory migration

`supabase/migrations/20261004010000_create_inventory_items.sql` was reviewed and
successfully executed manually in the existing hosted Supabase **SQL Editor**
using the **postgres** role. It creates the table, index, timestamp trigger,
grants, and policies in one transaction. **Do not rerun it in the existing
project.** Do not rerun the Phase 2 migration or household bootstrap either.

Keep **Automatically expose new tables** off, `public` exposed as before, and
`private` outside the Data API's exposed schemas. No Auth, environment, or
infrastructure replacement is needed.

## 2. Inventory schema

`public.inventory_items` exists with these columns:

| Column | Type | Default / relationship |
| --- | --- | --- |
| `id` | `uuid primary key` | `gen_random_uuid()` |
| `household_id` | `uuid not null` | References `public.households(id)` with `ON DELETE CASCADE` |
| `name` | `text not null` | Required, nonblank, trimmed, maximum 200 characters |
| `quantity` | `numeric(12,3) not null` | `0`; nonnegative and not `NaN` |
| `unit` | `text not null` | `'pcs'`; nonblank, trimmed, maximum 32 characters |
| `category` | `text not null` | `'Other'`; nonblank, trimmed, maximum 80 characters |
| `low_stock_threshold` | `numeric(12,3)` | Nullable; nonnegative and not `NaN` when supplied |
| `created_at` | `timestamptz not null` | `now()` |
| `updated_at` | `timestamptz not null` | `now()` |

`inventory_items_household_id_idx` indexes `household_id`. Categories and units
are text fields and allow custom values; no lookup tables or unit conversion
were added. Duplicate names and zero quantity are allowed.

`inventory_items_set_updated_at` is a `BEFORE UPDATE` row trigger calling
`private.set_inventory_item_updated_at()`. The function uses `SECURITY INVOKER`
and an empty search path. Manual verification confirmed that `updated_at`
changes after item modification.

## 3. Inventory RLS and privileges

RLS is enabled on `public.inventory_items`. These four authenticated policies
exist, all using the existing `private.is_household_member(household_id)` helper:

| Policy | Operation | Condition |
| --- | --- | --- |
| `inventory_items_select_for_members` | SELECT | `USING (private.is_household_member(household_id))` |
| `inventory_items_insert_for_members` | INSERT | `WITH CHECK (private.is_household_member(household_id))` |
| `inventory_items_update_for_members` | UPDATE | Both `USING` and `WITH CHECK` use `private.is_household_member(household_id)` |
| `inventory_items_delete_for_members` | DELETE | `USING (private.is_household_member(household_id))` |

Default privileges are revoked from `PUBLIC`, `anon`, and `authenticated` before
granting only the feature's required client privileges:

- `authenticated`: SELECT and DELETE on the table.
- INSERT only on `household_id`, `name`, `quantity`, `unit`, `category`, and
  `low_stock_threshold`.
- UPDATE only on `name`, `quantity`, `unit`, `category`, and
  `low_stock_threshold`.

Authenticated owners and members have identical inventory access. Protected
column privilege checks verified that `authenticated` cannot update
`household_id`, `id`, `created_at`, or `updated_at`. Anonymous users have no
SELECT access. Household and membership tables retain their Phase 2 read-only
client permissions; inventory write privileges do not extend to those tables.

## 4. Application ownership and mutation scope

`src/lib/household.ts` is server-only. It calls `supabase.auth.getUser()`, then
queries the existing RLS-protected `household_members` table with
`user_id = verifiedUser.id`. This filter is necessary because membership RLS
also exposes fellow members' rows. The resolver requires exactly one membership
and fails safely for zero, multiple, or failed results.

Every inventory Server Action uses the household ID returned by this resolver.
Browser-provided `household_id` is not trusted or used; forms contain no
household ownership field. Edit, quantity update, and delete queries filter by
both item `id` and resolved `household_id`. A quantity update changes only
`quantity`. Inputs are validated server-side, text is trimmed, and successful
mutations revalidate `/inventory`.

## 5. Verified manual application and security checks

The following results were confirmed by the user:

| Check | Verified result |
| --- | --- |
| Shared inventory for both existing users | Both see the same shared household inventory. |
| Both users' CRUD | Both can create, read, edit, change quantity, and delete shared items. |
| Visibility of another member's changes | Changes are visible to the other user after refresh. |
| Timestamp trigger | `updated_at` changes after item modification. |
| Low stock | An item is low stock when `quantity <= low_stock_threshold`, only when the threshold is not null. |
| Decimal quantities | Quantities up to three decimal places work. |
| Server validation with browser validation bypassed | Negative quantities and values with more than three decimal places are rejected; stored data remains unchanged. |
| Runtime household visibility | The authenticated Stockly user sees exactly one household during isolation testing. |
| Foreign-household inventory isolation | With rollback-only foreign-household fixtures, the authenticated Stockly user cannot see, update, or delete the foreign inventory item. |
| Protected-column privileges | `authenticated` cannot update `household_id`, `id`, `created_at`, or `updated_at`. |
| Anonymous access | Anonymous users have no SELECT access to inventory. |
| Fixture cleanup | Temporary foreign household/item security fixtures were rolled back. |
| Previous phases | Phase 1 Authentication and Phase 2 Shared Household remain working and unchanged. |

Admin queries as `postgres` bypass RLS and cannot establish client isolation.
The isolation results above came from runtime checks under the authenticated
Stockly user's identity. Temporary fixtures were used only inside rollback-only
transactions and were not retained. No real user UUIDs, emails, secrets,
passwords, or environment values are recorded here.

The implementation also passed `npm run lint`, `npm run build`, and 58 local
mocked security/validation and static migration checks before these manual
confirmations. Those local checks did not execute hosted SQL.

## 6. Next planned phase

**Phase 4 — Shopping list**, as defined in `STOCKLY_HANDOFF.md`, section 33.
Low-stock automation remains Phase 5. Shopping synchronization, activity history,
realtime, PWA, notifications, barcode scanning, and images were not implemented
as part of Phase 3. The low-stock indicator is present; automatic shopping-list
updates are not.
