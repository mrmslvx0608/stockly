"use client";

import { useActionState, useId, useState } from "react";
import { createItem, editItem } from "./actions";
import type { InventoryActionState, InventoryItem } from "./types";

const initialState: InventoryActionState = { error: null, success: false };
const emptyFields = { name: "", quantity: "0", unit: "pcs", category: "Other", low_stock_threshold: "" };
const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

export function InventoryItemForm({ item, onSaved, onCancel }: {
  item?: InventoryItem;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const prefix = useId();
  const [fields, setFields] = useState(item ? {
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    category: item.category,
    low_stock_threshold: item.low_stock_threshold === null ? "" : String(item.low_stock_threshold),
  } : emptyFields);
  const [state, formAction, pending] = useActionState(async (previous: InventoryActionState, data: FormData) => {
    const result = await (item ? editItem : createItem)(previous, data);
    if (result.success) {
      if (!item) setFields(emptyFields);
      onSaved?.();
    }
    return result;
  }, initialState);

  function field(name: keyof typeof fields) {
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
          <label htmlFor={`${prefix}-name`} className="mb-1 block text-sm font-medium">Name (max 200 characters)</label>
          <input {...field("name")} type="text" required maxLength={200} />
        </div>
        <div>
          <label htmlFor={`${prefix}-quantity`} className="mb-1 block text-sm font-medium">Quantity</label>
          <input {...field("quantity")} type="number" required min="0" max="999999999.999" step="0.001" />
        </div>
        <div>
          <label htmlFor={`${prefix}-unit`} className="mb-1 block text-sm font-medium">Unit (max 32 characters)</label>
          <input {...field("unit")} type="text" required maxLength={32} list={`${prefix}-units`} />
          <datalist id={`${prefix}-units`}>
            {["pcs", "kg", "g", "L", "mL"].map((unit) => <option key={unit} value={unit} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${prefix}-category`} className="mb-1 block text-sm font-medium">Category (max 80 characters)</label>
          <input {...field("category")} type="text" required maxLength={80} list={`${prefix}-categories`} />
          <datalist id={`${prefix}-categories`}>
            {["Food", "Drinks", "Household", "Hygiene", "Other"].map((category) => <option key={category} value={category} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${prefix}-low_stock_threshold`} className="mb-1 block text-sm font-medium">Low-stock threshold (optional)</label>
          <input {...field("low_stock_threshold")} type="number" min="0" max="999999999.999" step="0.001" placeholder="No threshold" />
        </div>
      </fieldset>
      <p className="text-xs text-zinc-400">Quantities support up to 3 decimal places. Thresholds use the item’s unit.</p>
      {state.error && <p id={`${prefix}-error`} role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state.success && !item && <p role="status" className="text-sm text-emerald-400">Item added.</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="cursor-pointer rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Saving…" : item ? "Save changes" : "Add item"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} disabled={pending} className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60">Cancel</button>}
      </div>
    </form>
  );
}
