import type { SupabaseClient } from '@supabase/supabase-js';

export type Supabase = SupabaseClient;

export interface SaleItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  available_stock: number;
}

export type PaymentMethod = 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta' | 'creditos';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export interface PendingSaleData {
  items: SaleItem[];
  payment_method: string;
  payments: PaymentSplit[];
  total: number;
  staff_user_id: string;
  staff_name: string;
}

export interface PendingWithdrawalData {
  _type: 'withdrawal';
  items: SaleItem[];
  total: number;
  staff_user_id: string;
  staff_name: string;
}

export interface PendingOpeningData {
  _type: 'opening';
  source: {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    available_stock: number;
  };
  items: {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
  }[];
  staff_user_id: string;
  staff_name: string;
}

export interface PendingStockAdjustmentData {
  _type: 'stock_adjustment';
  adjustments: {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity_change: number;
    current_stock: number;
    reason: string;
  }[];
  staff_user_id: string;
  staff_name: string;
}

export interface CashMovementData {
  type: 'ingreso' | 'retiro';
  amount: number;
  reason: string;
}

export interface DailySalesSummary {
  total_orders: number;
  total_amount: number;
  by_payment_method: Record<string, { count: number; amount: number }>;
  items_sold: number;
}

export interface AgentResult {
  type: 'sale' | 'error' | 'info' | 'cash_movement' | 'staff_withdrawal' | 'product_opening' | 'stock_adjustment' | 'tournament_inscription';
  items?: SaleItem[];
  payment_method?: string;
  payments?: PaymentSplit[];
  total?: number;
  message?: string;
  movement_type?: 'ingreso' | 'retiro';
  amount?: number;
  reason?: string;
  source?: {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    available_stock: number;
  };
  result_items?: {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
  }[];
  tournament_name?: string;
  participants?: number;
  fee_per_person?: number;
  adjustments?: {
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity_change: number;
    current_stock: number;
    reason: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'confirmation' | 'success' | 'error';
  confirmationType?: AgentResult['type'];
  confirmationData?: any;
}

export interface StaffUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}
