"use client";

import { useActionState, useId, useState } from "react";
import { deleteItem, updateQuantity } from "./actions";
import { InventoryItemForm } from "./inventory-item-form";
import type { InventoryActionState, InventoryItem } from "./types";

const initialState: InventoryActionState = { error: null, success: false };
const buttonClass = "cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-wait disabled:opacity-60";

function InventoryCard({ item }: { item: InventoryItem }) {
  const prefix = useId();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [quantityState, quantityAction, quantityPending] = useActionState(updateQuantity, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteItem, initialState);
  const pending = quantityPending || deletePending;
  const lowStock = item.low_stock_threshold !== null && item.quantity <= item.low_stock_threshold;

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-busy={pending}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold">{item.name}</h3>
          <p className="mt-1 break-words text-sm text-zinc-400">{item.category} · {item.quantity} {item.unit}</p>
          {item.low_stock_threshold !== null && <p className="mt-1 break-words text-xs text-zinc-400">Low-stock threshold: {item.low_stock_threshold} {item.unit}</p>}
        </div>
        {lowStock && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">Low stock</span>}
      </div>
      {editing ? (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <InventoryItemForm key={item.updated_at} item={item} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <>
          <form action={quantityAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="item_id" value={item.id} />
            <div>
              <label htmlFor={`${prefix}-quantity`} className="mb-1 block text-xs text-zinc-400">Quantity</label>
              <input key={item.updated_at} id={`${prefix}-quantity`} name="quantity" type="number" defaultValue={item.quantity} required min="0" max="999999999.999" step="0.001" disabled={pending} aria-describedby={quantityState.error ? `${prefix}-quantity-error` : undefined} className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-emerald-400 disabled:opacity-60" />
            </div>
            <button type="submit" disabled={pending} className={buttonClass}>{quantityPending ? "Saving…" : "Set quantity"}</button>
            <button type="button" disabled={pending} onClick={() => { setEditing(true); setConfirmingDelete(false); }} className={buttonClass}>Edit item</button>
            <button type="button" disabled={pending} onClick={() => setConfirmingDelete(true)} className={`${buttonClass} text-red-400`}>Delete</button>
          </form>
          {quantityState.error && <p id={`${prefix}-quantity-error`} role="alert" className="mt-3 text-sm text-red-400">{quantityState.error}</p>}
          {quantityState.success && <p role="status" className="mt-3 text-sm text-emerald-400">Quantity updated.</p>}
          {confirmingDelete && (
            <form action={deleteAction} className="mt-4 rounded-lg border border-red-400/30 p-4" aria-busy={deletePending}>
              <input type="hidden" name="item_id" value={item.id} />
              <p className="break-words text-sm">Delete “{item.name}” from your shared inventory?</p>
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

export function InventoryList({ items }: { items: InventoryItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">Your shared inventory is empty. Add your first item using the form above.</p>;
  }

  return <ul className="space-y-4">{items.map((item) => <InventoryCard key={item.id} item={item} />)}</ul>;
}
