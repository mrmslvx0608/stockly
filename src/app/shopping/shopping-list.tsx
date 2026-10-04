"use client";

import { useActionState, useId, useState } from "react";
import { deleteShoppingItem, purchaseShoppingItem, updateShoppingQuantity } from "./actions";
import { ShoppingItemForm } from "./shopping-item-form";
import type { InventoryOption, ShoppingActionState, ShoppingItem } from "./types";

const initialState: ShoppingActionState = { error: null, success: false };
const buttonClass = "cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-60";

function ShoppingCard({ item, inventoryOptions }: { item: ShoppingItem; inventoryOptions: InventoryOption[] }) {
  const prefix = useId();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [quantityState, quantityAction, quantityPending] = useActionState(updateShoppingQuantity, initialState);
  const [purchaseState, purchaseAction, purchasePending] = useActionState(purchaseShoppingItem, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteShoppingItem, initialState);
  const pending = quantityPending || purchasePending || deletePending;
  const completed = item.completed_at !== null;

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-busy={pending}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-lg font-semibold">{item.name}</h4>
          <p className="mt-1 break-words text-sm text-zinc-400">{item.category} · {item.quantity} {item.unit}</p>
          <p className="mt-1 text-xs text-zinc-400">{item.inventory_item_id ? "Linked to Inventory" : "Standalone shopping item"}</p>
        </div>
        {completed && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">Purchased</span>}
      </div>
      {!completed && editing ? (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <ShoppingItemForm key={item.updated_at} item={item} inventoryOptions={inventoryOptions} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <>
          {!completed && (
            <>
              <form action={purchaseAction} className="mt-4">
                <input type="hidden" name="item_id" value={item.id} />
                <button type="submit" disabled={pending} className="cursor-pointer rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-60">
                  {purchasePending ? "Purchasing…" : `Purchase ${item.quantity} ${item.unit}`}
                </button>
              </form>
              {purchaseState.error && <p role="alert" className="mt-3 text-sm text-red-400">{purchaseState.error}</p>}
              <form action={quantityAction} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="item_id" value={item.id} />
                <div>
                  <label htmlFor={`${prefix}-quantity`} className="mb-1 block text-xs text-zinc-400">Quantity to buy</label>
                  <input key={item.updated_at} id={`${prefix}-quantity`} name="quantity" type="number" defaultValue={item.quantity} required min="0.001" max="999999999.999" step="0.001" disabled={pending} aria-describedby={quantityState.error ? `${prefix}-quantity-error` : undefined} className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-emerald-400 disabled:opacity-60" />
                </div>
                <button type="submit" disabled={pending} className={buttonClass}>{quantityPending ? "Saving…" : "Set quantity"}</button>
                <button type="button" disabled={pending} onClick={() => { setEditing(true); setConfirmingDelete(false); }} className={buttonClass}>Edit</button>
              </form>
              {quantityState.error && <p id={`${prefix}-quantity-error`} role="alert" className="mt-3 text-sm text-red-400">{quantityState.error}</p>}
              {quantityState.success && <p role="status" className="mt-3 text-sm text-emerald-400">Quantity updated.</p>}
            </>
          )}
          <button type="button" disabled={pending} onClick={() => setConfirmingDelete(true)} className={`${buttonClass} mt-4 text-red-400`}>Delete</button>
          {confirmingDelete && (
            <form action={deleteAction} className="mt-4 rounded-lg border border-red-400/30 p-4" aria-busy={deletePending}>
              <input type="hidden" name="item_id" value={item.id} />
              <p className="break-words text-sm">Delete “{item.name}” from your {completed ? "purchased items" : "shopping list"}?</p>
              {completed && <p className="mt-2 text-xs text-zinc-400">Deleting this record does not undo the purchase or change Inventory.</p>}
              <div className="mt-3 flex gap-2">
                <button type="submit" disabled={pending} className={`${buttonClass} text-red-400`}>{deletePending ? "Deleting…" : "Confirm delete"}</button>
                <button type="button" disabled={pending} onClick={() => setConfirmingDelete(false)} className={buttonClass}>Cancel</button>
              </div>
              {deleteState.error && <p role="alert" className="mt-3 text-sm text-red-400">{deleteState.error}</p>}
            </form>
          )}
        </>
      )}
    </li>
  );
}

export function ShoppingList({ items, inventoryOptions, completed = false }: {
  items: ShoppingItem[];
  inventoryOptions: InventoryOption[];
  completed?: boolean;
}) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">{completed ? "No purchased items yet. Purchased items will appear here." : "Your shopping list is empty. Add something you need to buy using the form above."}</p>;
  }

  const categories = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const group = categories.get(item.category) ?? [];
    group.push(item);
    categories.set(item.category, group);
  }

  return (
    <div className="space-y-6">
      {[...categories].sort(([a], [b]) => a.localeCompare(b)).map(([category, group]) => (
        <section key={category} aria-label={`${category} ${completed ? "purchased items" : "shopping items"}`}>
          <h3 className="mb-3 break-words text-sm font-semibold uppercase tracking-wide text-emerald-400">{category}</h3>
          <ul className="space-y-4">{group.map((item) => <ShoppingCard key={item.id} item={item} inventoryOptions={inventoryOptions} />)}</ul>
        </section>
      ))}
    </div>
  );
}
