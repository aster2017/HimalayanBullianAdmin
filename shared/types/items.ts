/**
 * Item/Inventory types and interfaces
 */

/**
 * Item Image
 */
export interface ItemImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  displayOrder: number;
}

/**
 * Item/Product in inventory
 * Fields match backend ItemDto exactly
 */
export interface Item {
  id: string;
  zohoItemId?: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  subCategory?: string;
  weight?: number;         // in grams
  purity?: string;         // e.g. "22K", "24K"
  material?: string;       // e.g. "Gold", "Silver"
  design?: string;
  rate: number;            // Unit price in currency
  costPrice: number;
  taxName?: string;
  taxPercentage: number;
  discountPercentage?: number;
  stockOnHand: number;     // Current stock quantity
  reorderLevel: number;
  unit?: string;           // e.g. "pcs", "grams", "set"
  isActive: boolean;
  isFeatured: boolean;
  source?: string;         // Local, Zoho, ThirdParty
  syncStatus?: string;     // Pending, InProgress, Success, Failed
  lastSyncedAt?: string;
  images?: ItemImage[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Item statistics
 */
export interface ItemStats {
  total: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
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
 * Maps to backend CreateItemDto
 */
export interface CreateItemRequest {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  subCategory?: string;
  weight?: number;
  purity?: string;
  material?: string;
  design?: string;
  rate: number;
  costPrice: number;
  taxName?: string;
  taxPercentage: number;
  discountPercentage?: number;
  stockOnHand: number;
  reorderLevel: number;
  unit?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

/**
 * Update item request
 * Maps to backend UpdateItemDto (excludes SKU which cannot be changed)
 */
export interface UpdateItemRequest {
  name?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  weight?: number;
  purity?: string;
  material?: string;
  design?: string;
  rate?: number;
  costPrice?: number;
  taxName?: string;
  taxPercentage?: number;
  discountPercentage?: number;
  stockOnHand?: number;
  reorderLevel?: number;
  unit?: string;
  isActive?: boolean;
  isFeatured?: boolean;
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
