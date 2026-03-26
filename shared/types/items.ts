/**
 * Item/Inventory types and interfaces
 */

/**
 * Item/Product in inventory
 */
export interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;
  costPrice?: number;
  currentStock: number;
  reorderLevel: number;
  leadTimeDays?: number;
  supplier?: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

/**
 * Stock transaction history
 */
export interface StockTransaction {
  id: string;
  itemId: string;
  type: 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  newBalance: number;
  date: string;
  notes?: string;
  referenceId?: string; // Order ID or Invoice ID
}

/**
 * Create item request
 */
export interface CreateItemRequest {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;
  costPrice?: number;
  currentStock: number;
  reorderLevel: number;
  leadTimeDays?: number;
  supplier?: string;
}

/**
 * Update item request
 */
export interface UpdateItemRequest {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  unitPrice?: number;
  costPrice?: number;
  reorderLevel?: number;
  leadTimeDays?: number;
  supplier?: string;
}

/**
 * Stock adjustment request
 */
export interface StockAdjustmentRequest {
  quantity: number; // Positive or negative
  type: 'purchase' | 'sale' | 'adjustment';
  notes?: string;
  referenceId?: string;
}

/**
 * Item detail with extended information
 */
export interface ItemDetail extends Item {
  stockHistory?: StockTransaction[];
  totalSoldCount?: number;
  lastRestockDate?: string;
  averageRestockQuantity?: number;
}

/**
 * Item list response
 */
export interface ItemListResponse {
  items: Item[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Item filters
 */
export interface ItemFilters {
  category?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock';
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Items state in Redux
 */
export interface ItemsState {
  list: Item[];
  detail: ItemDetail | null;
  stockHistory: StockTransaction[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Stock level status
 */
export enum StockStatus {
  InStock = 'in-stock',
  LowStock = 'low-stock',
  OutOfStock = 'out-of-stock',
}

/**
 * Get stock status based on current and reorder level
 */
export const getStockStatus = (current: number, reorderLevel: number): StockStatus => {
  if (current === 0) return StockStatus.OutOfStock;
  if (current <= reorderLevel) return StockStatus.LowStock;
  return StockStatus.InStock;
};
