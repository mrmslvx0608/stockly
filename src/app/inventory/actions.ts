"use server";

import { revalidatePath } from "next/cache";
import { resolveHousehold } from "@/lib/household";
import type { InventoryActionState } from "./types";

type Mutation = "create" | "edit" | "quantity" | "delete";
type ItemFields = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  low_stock_threshold: number | null;
};

function textField(formData: FormData, field: string, maxLength: number) {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value.length > 0 && [...value].length <= maxLength ? value : null;
}

function quantityField(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  // Match numeric(12,3) without silent rounding, exponents, NaN, or infinity.
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(value)) return null;
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
}

function itemFields(formData: FormData): ItemFields | null {
  const name = textField(formData, "name", 200);
  const unit = textField(formData, "unit", 32);
  const category = textField(formData, "category", 80);
  const quantity = quantityField(formData.get("quantity"));
  const rawThreshold = formData.get("low_stock_threshold");
  const thresholdEmpty = typeof rawThreshold === "string" && rawThreshold.trim() === "";
  const lowStockThreshold = thresholdEmpty ? null : quantityField(rawThreshold);

  if (!name || !unit || !category || quantity === null ||
    (!thresholdEmpty && lowStockThreshold === null)) return null;

  return { name, unit, category, quantity, low_stock_threshold: lowStockThreshold };
}

function failure(error: string): InventoryActionState {
  return { error, success: false };
}

async function mutate(formData: FormData, mutation: Mutation): Promise<InventoryActionState> {
  try {
    const context = await resolveHousehold();
    if (!context.ok) return failure(context.error);
    const { supabase, householdId } = context;

    const rawId = formData.get("item_id");
    if (mutation !== "create" && (typeof rawId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId))) {
      return failure("This item is unavailable. Refresh the inventory and try again.");
    }

    let query;
    if (mutation === "create" || mutation === "edit") {
      const fields = itemFields(formData);
      if (!fields) {
        return failure("Enter a name, unit, and category within the displayed limits, and nonnegative quantities with at most 3 decimal places (maximum 999999999.999).");
      }

      query = mutation === "create"
        ? supabase.from("inventory_items").insert({ ...fields, household_id: householdId })
        : supabase.from("inventory_items").update(fields)
          .eq("id", rawId as string).eq("household_id", householdId);
    } else if (mutation === "quantity") {
      const quantity = quantityField(formData.get("quantity"));
      if (quantity === null) {
        return failure("Enter a nonnegative quantity with at most 3 decimal places (maximum 999999999.999).");
      }
      query = supabase.from("inventory_items").update({ quantity })
        .eq("id", rawId as string).eq("household_id", householdId);
    } else {
      query = supabase.from("inventory_items").delete()
        .eq("id", rawId as string).eq("household_id", householdId);
    }

    // Detect missing/inaccessible items; zero affected rows are not success.
    const { data, error } = await query.select("id").maybeSingle();
    if (error) return failure("Unable to save this inventory change. Please try again.");
    if (!data) return failure("This item is unavailable. Refresh the inventory and try again.");
  } catch {
    return failure("Unable to connect. Please try again.");
  }

  revalidatePath("/inventory");
  return { error: null, success: true };
}

export async function createItem(_state: InventoryActionState, formData: FormData) {
  return mutate(formData, "create");
}

export async function editItem(_state: InventoryActionState, formData: FormData) {
  return mutate(formData, "edit");
}

export async function updateQuantity(_state: InventoryActionState, formData: FormData) {
  return mutate(formData, "quantity");
}

export async function deleteItem(_state: InventoryActionState, formData: FormData) {
  return mutate(formData, "delete");
}
