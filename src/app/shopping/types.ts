// Only UI fields cross the server/client boundary; ownership stays server-side.
export type ShoppingItem = {
  id: string;
  inventory_item_id: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  completed_at: string | null;
  updated_at: string;
};

export type InventoryOption = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

export type ShoppingActionState = { error: string | null; success: boolean };
