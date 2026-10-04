import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveHousehold } from "@/lib/household";
import { InventoryItemForm } from "./inventory-item-form";
import { InventoryList } from "./inventory-list";
import type { InventoryItem } from "./types";

export default async function InventoryPage() {
  const context = await resolveHousehold();
  if (!context.ok && context.reason === "authentication") redirect("/login");

  let items: InventoryItem[] = [];
  let loadError: string | null = context.ok ? null : context.error;

  if (context.ok) {
    try {
      const { data, error } = await context.supabase
        .from("inventory_items")
        .select("id, name, quantity, unit, category, low_stock_threshold, updated_at")
        .eq("household_id", context.householdId)
        .order("name")
        .order("id")
        .returns<InventoryItem[]>();

      if (error || !data) loadError = "Unable to load inventory. Please refresh and try again.";
      else items = data;
    } catch {
      loadError = "Unable to connect to inventory. Please refresh and try again.";
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-emerald-400">Stockly</Link>
        <nav aria-label="Main navigation" className="flex gap-2">
          <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">Dashboard</Link>
          <Link href="/shopping" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">Shopping</Link>
        </nav>
      </header>
      <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
      <p className="mt-2 mb-8 text-sm text-zinc-400">Manage your shared household items. Refresh to see changes made by the other member.</p>
      {loadError ? (
        <p role="alert" className="rounded-2xl border border-red-400/30 bg-zinc-900 p-6 text-sm text-red-400">{loadError}</p>
      ) : (
        <>
          <section aria-labelledby="add-item-heading" className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
            <h2 id="add-item-heading" className="mb-5 text-xl font-semibold">Add item</h2>
            <InventoryItemForm />
          </section>
          <section aria-labelledby="inventory-heading">
            <h2 id="inventory-heading" className="mb-4 text-xl font-semibold">Your items</h2>
            <InventoryList items={items} />
          </section>
        </>
      )}
    </main>
  );
}
