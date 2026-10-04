"use server";

import { revalidatePath } from "next/cache";
import { resolveHousehold } from "@/lib/household";
import type { InventoryOption, ShoppingActionState, ShoppingItem } from "./types";

type Context = Extract<Awaited<ReturnType<typeof resolveHousehold>>, { ok: true }>;
type Mutation = "create" | "edit" | "quantity" | "delete";

function uuid(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function textField(formData: FormData, field: string, limit: number) {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value.length > 0 && [...value].length <= limit ? value : null;
}

function quantityField(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !/^\d{1,9}(?:\.\d{1,3})?$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function failure(error: string): ShoppingActionState {
  return { error, success: false };
}

async function inventoryOption(context: Context, id: string) {
  const { data, error } = await context.supabase.from("inventory_items")
    .select("id, name, category, unit")
    .eq("id", id).eq("household_id", context.householdId)
    .maybeSingle<InventoryOption>();
  return error ? null : data;
}

async function mutate(formData: FormData, mutation: Mutation): Promise<ShoppingActionState> {
  try {
    const context = await resolveHousehold();
    if (!context.ok) return failure(context.error);
    const { supabase, householdId } = context;
    const id = formData.get("item_id");
    let existing: ShoppingItem | null = null;

    if (mutation !== "create") {
      if (!uuid(id)) return failure("This shopping item is unavailable. Refresh and try again.");
      const { data, error } = await supabase.from("shopping_items")
        .select("id, inventory_item_id, name, category, quantity, unit, completed_at, updated_at")
        .eq("id", id).eq("household_id", householdId).maybeSingle<ShoppingItem>();
      if (error || !data) return failure("This shopping item is unavailable. Refresh and try again.");
      existing = data;
      if (mutation !== "delete" && existing.completed_at !== null) {
        return failure("Purchased items cannot be edited.");
      }
    }

    let query;
    if (mutation === "create" || mutation === "edit") {
      const quantity = quantityField(formData.get("quantity"));
      const name = textField(formData, "name", 200);
      const category = textField(formData, "category", 80);
      const unit = textField(formData, "unit", 32);
      const rawLink = formData.get("inventory_item_id");
      if (quantity === null || !name || !category || !unit || typeof rawLink !== "string" ||
        (rawLink !== "" && !uuid(rawLink))) {
        return failure("Enter a name, category, and unit within the displayed limits, and a quantity greater than 0 with at most 3 decimal places (maximum 999999999.999).");
      }

      const linked = rawLink === "" ? null : await inventoryOption(context, rawLink);
      if (rawLink !== "" && !linked) return failure("Linked inventory item is unavailable. Refresh and choose an item from your household.");
      if (linked && unit !== linked.unit) return failure("The inventory unit has changed. Refresh and select the inventory item again.");

      // Linked metadata comes from the current household inventory, not the browser.
      const fields = {
        inventory_item_id: linked?.id ?? null,
        name: linked?.name ?? name,
        category: linked?.category ?? category,
        unit: linked?.unit ?? unit,
        quantity,
      };
      // Database default derives household_id; protected columns are never sent.
      query = mutation === "create"
        ? supabase.from("shopping_items").insert(fields)
        : supabase.from("shopping_items").update(fields)
          .eq("id", id as string).eq("household_id", householdId).is("completed_at", null);
    } else {
      // Re-check existing links even for quantity-only changes and deletion.
      const linked = existing?.inventory_item_id
        ? await inventoryOption(context, existing.inventory_item_id) : null;
      if (existing?.inventory_item_id && !linked) return failure("Linked inventory item is unavailable. Refresh and try again.");

      if (mutation === "quantity") {
        const quantity = quantityField(formData.get("quantity"));
        if (quantity === null) return failure("Enter a quantity greater than 0 with at most 3 decimal places (maximum 999999999.999).");
        if (linked && linked.unit !== existing?.unit) return failure("The inventory unit has changed. Edit the shopping item before changing its quantity.");
        query = supabase.from("shopping_items").update({ quantity })
          .eq("id", id as string).eq("household_id", householdId).is("completed_at", null);
      } else {
        query = supabase.from("shopping_items").delete()
          .eq("id", id as string).eq("household_id", householdId);
      }
    }

    const { data, error } = await query.select("id").maybeSingle();
    if (error) return failure("Unable to save this shopping change. Refresh and try again.");
    if (!data) return failure("This shopping item is unavailable or already purchased. Refresh and try again.");
  } catch {
    return failure("Unable to connect. Please try again.");
  }

  revalidatePath("/shopping");
  return { error: null, success: true };
}

export async function createShoppingItem(_state: ShoppingActionState, formData: FormData) {
  return mutate(formData, "create");
}

export async function editShoppingItem(_state: ShoppingActionState, formData: FormData) {
  return mutate(formData, "edit");
}

export async function updateShoppingQuantity(_state: ShoppingActionState, formData: FormData) {
  return mutate(formData, "quantity");
}

export async function deleteShoppingItem(_state: ShoppingActionState, formData: FormData) {
  return mutate(formData, "delete");
}

export async function purchaseShoppingItem(_state: ShoppingActionState, formData: FormData): Promise<ShoppingActionState> {
  let linkedPurchase = false;
  try {
    const context = await resolveHousehold();
    if (!context.ok) return failure(context.error);
    const id = formData.get("item_id");
    if (!uuid(id)) return failure("This shopping item is unavailable. Refresh and try again.");

    // The database authorizes, locks, increments, and completes atomically.
    const { data, error } = await context.supabase.rpc("purchase_shopping_item", { p_item_id: id });
    if (error || typeof data !== "boolean") {
      return failure("Unable to purchase this item. Refresh and check that it is active, its linked unit matches Inventory, and the purchase fits within the maximum inventory quantity.");
    }
    linkedPurchase = data;
  } catch {
    return failure("Unable to connect. Refresh before retrying the purchase.");
  }

  revalidatePath("/shopping");
  if (linkedPurchase) revalidatePath("/inventory");
  return { error: null, success: true };
}
