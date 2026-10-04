import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveHousehold } from "@/lib/household";
import { ShoppingItemForm } from "./shopping-item-form";
import { ShoppingList } from "./shopping-list";
import type { InventoryOption, ShoppingItem } from "./types";

export default async function ShoppingPage() {
  const context = await resolveHousehold();
  if (!context.ok && context.reason === "authentication") redirect("/login");

  let items: ShoppingItem[] = [];
  let inventoryOptions: InventoryOption[] = [];
  let loadError: string | null = context.ok ? null : context.error;

  if (context.ok) {
    try {
      const [shopping, inventory] = await Promise.all([
        context.supabase.from("shopping_items")
          .select("id, inventory_item_id, name, category, quantity, unit, completed_at, updated_at")
          .eq("household_id", context.householdId).order("category").order("name").order("id")
          .returns<ShoppingItem[]>(),
        context.supabase.from("inventory_items").select("id, name, category, unit")
          .eq("household_id", context.householdId).order("name").order("id")
          .returns<InventoryOption[]>(),
      ]);
      if (shopping.error || inventory.error || !shopping.data || !inventory.data) {
        loadError = "Unable to load Shopping and Inventory. Please refresh and try again.";
      } else {
        items = shopping.data;
        inventoryOptions = inventory.data;
      }
    } catch {
      loadError = "Unable to connect to Shopping. Please refresh and try again.";
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-emerald-400">Stockly</Link>
        <nav aria-label="Main navigation" className="flex gap-2">
          <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">Dashboard</Link>
          <Link href="/inventory" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">Inventory</Link>
        </nav>
      </header>
      <h1 className="text-3xl font-semibold tracking-tight">Shopping</h1>
      <p className="mt-2 mb-8 text-sm text-zinc-400">What your household needs to buy. Refresh to see changes made by the other member.</p>
      {loadError ? (
        <p role="alert" className="rounded-2xl border border-red-400/30 bg-zinc-900 p-6 text-sm text-red-400">{loadError}</p>
      ) : (
        <>
          <section aria-labelledby="add-shopping-heading" className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
            <h2 id="add-shopping-heading" className="mb-5 text-xl font-semibold">Add shopping item</h2>
            <ShoppingItemForm inventoryOptions={inventoryOptions} />
          </section>
          <section aria-labelledby="active-shopping-heading" className="mb-10">
            <h2 id="active-shopping-heading" className="mb-4 text-xl font-semibold">Active Shopping</h2>
            <ShoppingList items={items.filter((item) => item.completed_at === null)} inventoryOptions={inventoryOptions} />
          </section>
          <section aria-labelledby="purchased-shopping-heading">
            <h2 id="purchased-shopping-heading" className="mb-4 text-xl font-semibold">Purchased / Completed</h2>
            <ShoppingList items={items.filter((item) => item.completed_at !== null)} inventoryOptions={inventoryOptions} completed />
          </section>
        </>
      )}
    </main>
  );
}
