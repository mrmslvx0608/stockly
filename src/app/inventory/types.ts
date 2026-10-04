// Only the item fields needed by the UI cross the server/client boundary.
export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  low_stock_threshold: number | null;
  updated_at: string;
};

export type InventoryActionState = {
  error: string | null;
  success: boolean;
};
