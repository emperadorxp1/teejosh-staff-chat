import type { Supabase, PendingSaleData, CashMovementData, DailySalesSummary } from '../types';

export async function hasOpenSession(supabase: Supabase): Promise<boolean> {
  const { data } = await supabase
    .from('cash_register_sessions')
    .select('id')
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function openCashSession(
  supabase: Supabase,
  staffUserId: string,
  openingAmount: number
) {
  const { error } = await supabase.rpc('open_cash_session', {
    p_user_id: staffUserId,
    p_opening_amount: openingAmount,
  });

  if (error) {
    if (error.message.includes('Ya hay una sesion')) {
      return { success: false, error: 'Ya hay una sesion de caja abierta.' };
    }
    return { success: false, error: 'Error al abrir la caja.' };
  }
  return { success: true };
}

export async function closeCashSession(
  supabase: Supabase,
  staffUserId: string,
  actualCash: number,
  notes?: string
) {
  const { data: session } = await supabase
    .from('cash_register_sessions')
    .select('id')
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();

  if (!session) return { success: false, error: 'No hay una sesion de caja abierta.' };

  const { error } = await supabase.rpc('close_cash_session', {
    p_session_id: session.id,
    p_user_id: staffUserId,
    p_actual_cash: actualCash,
    p_notes: notes || null,
  });

  if (error) return { success: false, error: error.message || 'Error al cerrar la caja.' };

  const { data: closed } = await supabase
    .from('cash_register_sessions')
    .select('expected_cash, difference')
    .eq('id', session.id)
    .single();

  return {
    success: true,
    expected: closed?.expected_cash ?? 0,
    difference: closed?.difference ?? 0,
  };
}

export async function registerSale(supabase: Supabase, sale: PendingSaleData) {
  try {
    const sessionOpen = await hasOpenSession(supabase);
    if (!sessionOpen) {
      return { success: false, error: 'No hay sesion de caja abierta. Abre la caja primero.' };
    }

    for (const item of sale.items) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity, reserved_quantity')
        .eq('product_id', item.product_id)
        .single();

      if (!inv) return { success: false, error: `Producto "${item.product_name}" no tiene inventario.` };

      const available = inv.quantity - inv.reserved_quantity;
      if (available < item.quantity) {
        return { success: false, error: `Stock insuficiente para "${item.product_name}": disponible ${available}, solicitado ${item.quantity}.` };
      }
    }

    const isSplitPayment = sale.payments && sale.payments.length > 1;
    const orderPaymentMethod = isSplitPayment
      ? 'mixto'
      : (sale.payments?.[0]?.method || sale.payment_method);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: null,
        guest_email: null,
        status: 'delivered',
        payment_status: 'paid',
        payment_method: orderPaymentMethod,
        subtotal: sale.total,
        discount_amount: 0,
        shipping_amount: 0,
        tax_amount: 0,
        total: sale.total,
        points_earned: Math.floor(sale.total / 10),
        points_used: 0,
        delivery_method: 'pickup',
        shipping_address: null,
        billing_address: null,
        sold_by: sale.staff_user_id,
        notes: `Venta en tienda via Staff Chat - Registrado por: ${sale.staff_name}`,
      })
      .select('id, order_number')
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return { success: false, error: `Error al crear el pedido: ${orderError?.message || 'sin datos'}` };
    }

    if (isSplitPayment && sale.payments) {
      await supabase.from('order_payments').insert(
        sale.payments.map((p) => ({
          order_id: order.id,
          payment_method: p.method,
          amount: p.amount,
        }))
      );
    }

    await supabase.from('order_items').insert(
      sale.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
    );

    for (const item of sale.items) {
      await supabase.rpc('reserve_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
      await supabase.rpc('confirm_stock_reservation', { p_product_id: item.product_id, p_quantity: item.quantity, p_order_id: order.id });
    }

    return { success: true, orderNumber: order.order_number };
  } catch (error) {
    console.error('Register sale error:', error);
    return { success: false, error: 'Error inesperado al registrar la venta.' };
  }
}

export async function cancelSale(supabase: Supabase, orderNumber: string) {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`id, order_number, status, notes, order_items (product_id, quantity)`)
      .eq('order_number', orderNumber.toUpperCase())
      .single();

    if (orderError || !order) return { success: false, error: `Pedido ${orderNumber} no encontrado.` };
    if (order.status === 'cancelled') return { success: false, error: 'Este pedido ya esta cancelado.' };
    if (order.status === 'refunded') return { success: false, error: 'Este pedido ya fue reembolsado.' };

    for (const item of order.order_items as any[]) {
      await supabase.rpc('restore_stock', { p_product_id: item.product_id, p_quantity: item.quantity, p_order_id: order.id });
    }

    const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
        notes: `${order.notes || ''}\n[${timestamp}] Cancelado via Staff Chat`,
      })
      .eq('id', order.id);

    return { success: true };
  } catch (error) {
    console.error('Cancel sale error:', error);
    return { success: false, error: 'Error inesperado al cancelar la venta.' };
  }
}

export function getTodayStartISO(): string {
  const now = new Date();
  const peruOffset = -5 * 60;
  const peruTime = new Date(now.getTime() + (peruOffset - now.getTimezoneOffset()) * 60000);
  peruTime.setHours(0, 0, 0, 0);
  return new Date(peruTime.getTime() - (peruOffset - now.getTimezoneOffset()) * 60000).toISOString();
}

export async function getDailySalesSummary(supabase: Supabase): Promise<DailySalesSummary> {
  const todayISO = getTodayStartISO();

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, total, order_items (quantity)`)
    .gte('created_at', todayISO)
    .neq('status', 'cancelled')
    .neq('status', 'refunded');

  if (!orders) return { total_orders: 0, total_amount: 0, by_payment_method: {}, items_sold: 0 };

  const summary: DailySalesSummary = { total_orders: orders.length, total_amount: 0, by_payment_method: {}, items_sold: 0 };
  const orderIds = orders.map((o) => o.id);

  for (const order of orders) {
    summary.total_amount += order.total;
    for (const item of (order.order_items as any[]) || []) {
      summary.items_sold += item.quantity;
    }
  }

  if (orderIds.length > 0) {
    const { data: payments } = await supabase.from('order_payments').select('payment_method, amount').in('order_id', orderIds);
    if (payments) {
      for (const p of payments) {
        const method = p.payment_method || 'sin especificar';
        if (!summary.by_payment_method[method]) summary.by_payment_method[method] = { count: 0, amount: 0 };
        summary.by_payment_method[method].count++;
        summary.by_payment_method[method].amount += p.amount;
      }
    }
  }

  return summary;
}

export async function registerCashMovement(supabase: Supabase, data: CashMovementData, staffUserId: string) {
  try {
    const { data: openSession } = await supabase
      .from('cash_register_sessions')
      .select('id')
      .eq('status', 'open')
      .limit(1)
      .maybeSingle();

    if (!openSession) return { success: false, error: 'No hay sesion de caja abierta.' };

    const { error } = await supabase.from('cash_movements').insert({
      session_id: openSession.id,
      type: data.type,
      amount: data.amount,
      reason: data.reason,
      performed_by: staffUserId,
    });

    if (error) return { success: false, error: 'Error al registrar el movimiento de caja.' };
    return { success: true };
  } catch (error) {
    console.error('Cash movement error:', error);
    return { success: false, error: 'Error inesperado.' };
  }
}

export async function getCashSessionStatus(supabase: Supabase) {
  const { data: session } = await supabase
    .from('cash_register_sessions')
    .select('id, opening_amount, opened_at, opened_by')
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();

  if (!session) return { isOpen: false as const };

  const { data: movements } = await supabase
    .from('cash_movements')
    .select('type, amount, reason')
    .eq('session_id', session.id);

  let ingresos = 0;
  let retiros = 0;
  if (movements) {
    for (const m of movements) {
      if (m.type === 'ingreso') ingresos += m.amount;
      else retiros += m.amount;
    }
  }

  return {
    isOpen: true as const,
    sessionId: session.id,
    openingAmount: session.opening_amount,
    openedAt: session.opened_at,
    ingresos,
    retiros,
    movementCount: movements?.length ?? 0,
  };
}
