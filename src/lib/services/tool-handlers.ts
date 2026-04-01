import type { Supabase, DailySalesSummary } from '../types';
import type { ToolName } from './tools';

export async function handleToolCall(
  supabase: Supabase,
  name: ToolName,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'search_products':
      return JSON.stringify(await searchProducts(supabase, input.query as string));
    case 'check_stock':
      return JSON.stringify(await checkStock(supabase, input.product_id as string));
    case 'get_daily_sales':
      return JSON.stringify(await getDailySales(supabase));
    case 'list_daily_sales':
      return JSON.stringify(await listDailySales(supabase));
    default:
      return JSON.stringify({ error: `Tool desconocido: ${name}` });
  }
}

const SELECT_FIELDS = `id, name, sku, price, image_url, inventory!inner (quantity, reserved_quantity)`;

// Words to strip from search queries - common Spanish sale words, articles, prepositions
const STOP_WORDS = new Set([
  'vendi', 'vendo', 'vendí', 'vendimos', 'venta', 'se', 'vendio', 'vendió',
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'para', 'por', 'con', 'en', 'al', 'a', 'y', 'o',
  'me', 'mi', 'le', 'lo', 'nos',
  'sobre', 'sobres', // "sobre" is slang for booster pack, not useful as search term
]);

function cleanQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter((w) => {
      const lower = w.toLowerCase();
      // Remove stop words, pure numbers, and single chars
      return w.length >= 2 && !STOP_WORDS.has(lower) && !/^\d+$/.test(w);
    })
    .join(' ');
}

function formatResults(products: any[]) {
  return products.map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    stock: p.inventory?.quantity ?? 0,
    reserved: p.inventory?.reserved_quantity ?? 0,
    available: (p.inventory?.quantity ?? 0) - (p.inventory?.reserved_quantity ?? 0),
    image_url: p.image_url,
  }));
}

async function searchProducts(supabase: Supabase, query: string) {
  // Clean the query: remove stop words, numbers, etc.
  const cleaned = cleanQuery(query);
  const searchQuery = cleaned || query.trim(); // fallback to original if everything was stripped
  const words = searchQuery.split(/\s+/).filter((w) => w.length >= 2);

  if (words.length === 0) {
    return [];
  }

  // Strategy 1: All words must match (most specific)
  let wordQuery = supabase
    .from('products')
    .select(SELECT_FIELDS)
    .eq('is_active', true);

  for (const word of words) {
    wordQuery = wordQuery.ilike('name', `%${word}%`);
  }

  const { data: wordResults } = await wordQuery.limit(10);

  // Strategy 2: Direct substring or SKU match
  const { data: directResults } = await supabase
    .from('products')
    .select(SELECT_FIELDS)
    .eq('is_active', true)
    .or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`)
    .limit(10);

  const seen = new Set<string>();
  const combined: any[] = [];

  for (const list of [wordResults || [], directResults || []]) {
    for (const p of list) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        combined.push(p);
      }
    }
  }

  // Strategy 3: If no results yet, try each word individually
  if (combined.length === 0 && words.length > 1) {
    for (const word of words) {
      if (word.length < 3) continue;
      const { data } = await supabase
        .from('products')
        .select(SELECT_FIELDS)
        .eq('is_active', true)
        .ilike('name', `%${word}%`)
        .limit(5);

      if (data) {
        for (const p of data) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            combined.push(p);
          }
        }
      }
    }
  }

  return formatResults(combined.slice(0, 10));
}

async function checkStock(supabase: Supabase, productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`id, name, inventory (quantity, reserved_quantity)`)
    .eq('id', productId)
    .single();

  if (error || !data) return { error: 'Producto no encontrado' };

  const inv = (data as any).inventory;
  return {
    product_id: data.id,
    name: data.name,
    stock: inv?.quantity ?? 0,
    reserved: inv?.reserved_quantity ?? 0,
    available: (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0),
  };
}

interface DailySaleDetail {
  order_number: string;
  time: string;
  items: { product_name: string; quantity: number; unit_price: number; total_price: number }[];
  total: number;
  payment_method: string;
  staff: string;
  status: string;
}

async function listDailySales(supabase: Supabase): Promise<DailySaleDetail[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, order_number, created_at, total, payment_method, status, sold_by, users:sold_by (full_name), order_items (product_name, quantity, unit_price, total_price)`)
    .gte('created_at', todayISO)
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: payments } = await supabase
    .from('order_payments')
    .select('order_id, payment_method, amount')
    .in('order_id', orderIds);

  const paymentsByOrder = new Map<string, { method: string; amount: number }[]>();
  if (payments) {
    for (const p of payments) {
      const list = paymentsByOrder.get(p.order_id) || [];
      list.push({ method: p.payment_method, amount: p.amount });
      paymentsByOrder.set(p.order_id, list);
    }
  }

  return orders.map((o) => {
    const orderPayments = paymentsByOrder.get(o.id) || [];
    const paymentStr = orderPayments.length > 1
      ? orderPayments.map((p) => `${p.method}: S/${p.amount.toFixed(2)}`).join(', ')
      : orderPayments[0]?.method || o.payment_method || 'efectivo';

    const staff = (o as any).users?.full_name || '';

    const createdAt = new Date(o.created_at);
    const time = createdAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

    return {
      order_number: o.order_number,
      time,
      items: (o.order_items as any[] || []).map((i: any) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      })),
      total: o.total,
      payment_method: paymentStr,
      staff,
      status: o.status,
    };
  });
}

async function getDailySales(supabase: Supabase): Promise<DailySalesSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, total, order_items (quantity)`)
    .gte('created_at', todayISO)
    .neq('status', 'cancelled')
    .neq('status', 'refunded');

  if (!orders) return { total_orders: 0, total_amount: 0, by_payment_method: {}, items_sold: 0 };

  const summary: DailySalesSummary = {
    total_orders: orders.length,
    total_amount: 0,
    by_payment_method: {},
    items_sold: 0,
  };

  const orderIds = orders.map((o) => o.id);

  for (const order of orders) {
    summary.total_amount += order.total;
    const items = order.order_items as any[];
    if (items) {
      for (const item of items) {
        summary.items_sold += item.quantity;
      }
    }
  }

  if (orderIds.length > 0) {
    const { data: payments } = await supabase
      .from('order_payments')
      .select('payment_method, amount')
      .in('order_id', orderIds);

    if (payments) {
      for (const p of payments) {
        const method = p.payment_method || 'sin especificar';
        if (!summary.by_payment_method[method]) {
          summary.by_payment_method[method] = { count: 0, amount: 0 };
        }
        summary.by_payment_method[method].count++;
        summary.by_payment_method[method].amount += p.amount;
      }
    }
  }

  return summary;
}
