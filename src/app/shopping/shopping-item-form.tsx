"use client";

import { useActionState, useId, useState } from "react";
import { createShoppingItem, editShoppingItem } from "./actions";
import type { InventoryOption, ShoppingActionState, ShoppingItem } from "./types";

const initialState: ShoppingActionState = { error: null, success: false };
const emptyFields = { inventory_item_id: "", name: "", category: "Other", quantity: "1", unit: "pcs" };
const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 read-only:text-zinc-400";

export function ShoppingItemForm({ inventoryOptions, item, onSaved, onCancel }: {
  inventoryOptions: InventoryOption[];
  item?: ShoppingItem;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const prefix = useId();
  const [fields, setFields] = useState(() => {
    if (!item) return emptyFields;
    const linked = inventoryOptions.find((option) => option.id === item.inventory_item_id);
    return {
      inventory_item_id: item.inventory_item_id ?? "",
      name: linked?.name ?? item.name,
      category: linked?.category ?? item.category,
      unit: linked?.unit ?? item.unit,
      quantity: String(item.quantity),
    };
  });
  const [state, formAction, pending] = useActionState(async (previous: ShoppingActionState, data: FormData) => {
    const result = await (item ? editShoppingItem : createShoppingItem)(previous, data);
    if (result.success) {
      if (!item) setFields(emptyFields);
      onSaved?.();
    }
    return result;
  }, initialState);
  const linked = fields.inventory_item_id !== "";
  const missingLink = linked && !inventoryOptions.some((option) => option.id === fields.inventory_item_id);

  function field(name: "name" | "category" | "quantity" | "unit") {
    return {
      id: `${prefix}-${name}`,
      name,
      value: fields[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [name]: event.target.value }),
      className: inputClass,
      "aria-describedby": state.error ? `${prefix}-error` : undefined,
    };
  }

  return (
    <form action={formAction} className="space-y-4" aria-busy={pending}>
      {item && <input type="hidden" name="item_id" value={item.id} />}
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
        <div className="sm:col-span-2">
          <label htmlFor={`${prefix}-inventory`} className="mb-1 block text-sm font-medium">Inventory link (optional)</label>
          <select
            id={`${prefix}-inventory`}
            name="inventory_item_id"
            value={fields.inventory_item_id}
            aria-describedby={`${prefix}-link-help`}
            className={inputClass}
            onChange={(event) => {
              const inventoryId = event.target.value;
              const option = inventoryOptions.find((candidate) => candidate.id === inventoryId);
              setFields({ ...fields, inventory_item_id: inventoryId, ...(option ? { name: option.name, category: option.category, unit: option.unit } : {}) });
            }}
          >
            <option value="">Standalone shopping item</option>
            {missingLink && <option value={fields.inventory_item_id}>Linked item unavailable — choose another item</option>}
            {inventoryOptions.map((option, index) => (
              <option key={option.id} value={option.id}>{option.name} · {option.category} · {option.unit} (item {index + 1})</option>
            ))}
          </select>
          <p id={`${prefix}-link-help`} className="mt-2 text-xs text-zinc-400">Linked purchases add the full shopping quantity to Inventory. Standalone purchases only complete this item.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${prefix}-name`} className="mb-1 block text-sm font-medium">Name (max 200 characters)</label>
          <input {...field("name")} type="text" required maxLength={200} readOnly={linked} />
        </div>
        <div>
          <label htmlFor={`${prefix}-category`} className="mb-1 block text-sm font-medium">Category (max 80 characters)</label>
          <input {...field("category")} type="text" required maxLength={80} readOnly={linked} list={`${prefix}-categories`} />
          <datalist id={`${prefix}-categories`}>
            {["Food", "Drinks", "Household", "Hygiene", "Other"].map((category) => <option key={category} value={category} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${prefix}-quantity`} className="mb-1 block text-sm font-medium">Quantity to buy</label>
          <input {...field("quantity")} type="number" required min="0.001" max="999999999.999" step="0.001" />
        </div>
        <div>
          <label htmlFor={`${prefix}-unit`} className="mb-1 block text-sm font-medium">Unit (max 32 characters)</label>
          <input {...field("unit")} type="text" required maxLength={32} readOnly={linked} list={`${prefix}-units`} />
          <datalist id={`${prefix}-units`}>
            {["pcs", "kg", "g", "L", "mL"].map((unit) => <option key={unit} value={unit} />)}
          </datalist>
        </div>
      </fieldset>
      <p className="text-xs text-zinc-400">Quantities must be greater than 0 and support up to 3 decimal places.{linked && " Name, category, and unit come from the linked Inventory item."}</p>
      {state.error && <p id={`${prefix}-error`} role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state.success && !item && <p role="status" className="text-sm text-emerald-400">Shopping item added.</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending || missingLink} className="cursor-pointer rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Saving…" : item ? "Save changes" : "Add shopping item"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} disabled={pending} className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60">Cancel</button>}
      </div>
    </form>
  );
}
