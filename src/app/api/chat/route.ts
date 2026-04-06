import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { processMessage } from '@/lib/services/agent';
import { hasOpenSession, registerCashMovement } from '@/lib/services/sales';
import { formatCashMovement, formatTournamentInscription } from '@/lib/formatting';
import type { PaymentSplit, PendingSaleData, PendingWithdrawalData, PendingOpeningData, PendingStockAdjustmentData, PendingCancellationData } from '@/lib/types';

export async function POST(request: Request) {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { message } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Mensaje vacio' }, { status: 400 });

  const { user, serviceClient } = auth;
  const result = await processMessage(serviceClient, message, user.id, user.role);

  // Check cash session for operations that require it
  if (result.type === 'sale' || result.type === 'cash_movement' || result.type === 'tournament_inscription') {
    const sessionOpen = await hasOpenSession(serviceClient);
    if (!sessionOpen) {
      return NextResponse.json({
        result: {
          type: 'error',
          message: 'No hay sesion de caja abierta. Abre la caja primero.',
        },
      });
    }
  }

  // Stock adjustment - admin only
  if (result.type === 'stock_adjustment' && user.role !== 'admin') {
    return NextResponse.json({
      result: {
        type: 'error',
        message: 'Solo administradores pueden ajustar stock.',
      },
    });
  }

  // Handle immediate actions (no confirmation needed)
  if (result.type === 'tournament_inscription' && result.tournament_name && result.participants && result.fee_per_person && result.total != null) {
    const paymentMethod = result.payment_method || 'efectivo';
    const reason = `[TORNEO] ${result.tournament_name} (${result.participants} x S/${result.fee_per_person.toFixed(2)}) - ${paymentMethod}`;
    const movResult = await registerCashMovement(
      serviceClient,
      { type: 'ingreso', amount: result.total, reason },
      user.id
    );
    if (movResult.success) {
      return NextResponse.json({
        result: {
          type: 'success',
          message: formatTournamentInscription(result.tournament_name, result.participants, result.fee_per_person, result.total, paymentMethod),
        },
      });
    }
    return NextResponse.json({ result: { type: 'error', message: movResult.error } });
  }

  if (result.type === 'cash_movement' && result.movement_type && result.amount && result.reason) {
    const movementData = { type: result.movement_type, amount: result.amount, reason: result.reason };
    const movResult = await registerCashMovement(serviceClient, movementData, user.id);
    if (movResult.success) {
      return NextResponse.json({
        result: {
          type: 'success',
          message: formatCashMovement(movementData),
        },
      });
    }
    return NextResponse.json({ result: { type: 'error', message: movResult.error } });
  }

  // Handle actions that need confirmation
  if (result.type === 'sale' && result.items && result.total != null) {
    let payments: PaymentSplit[] = result.payments || [];
    if (payments.length === 0) {
      payments = [{ method: (result.payment_method || 'efectivo') as any, amount: result.total }];
    }

    const saleData: PendingSaleData = {
      items: result.items,
      payment_method: payments.length > 1 ? 'mixto' : payments[0].method,
      payments,
      total: result.total,
      staff_user_id: user.id,
      staff_name: user.full_name || user.email,
    };

    return NextResponse.json({
      result: { type: 'sale' },
      confirmation: { type: 'sale', data: saleData },
      user: { id: user.id, name: user.full_name || user.email, role: user.role },
    });
  }

  if (result.type === 'staff_withdrawal' && result.items && result.total != null) {
    const data: PendingWithdrawalData = {
      _type: 'withdrawal',
      items: result.items,
      total: result.total,
      staff_user_id: user.id,
      staff_name: user.full_name || user.email,
    };
    return NextResponse.json({
      result: { type: 'staff_withdrawal' },
      confirmation: { type: 'staff_withdrawal', data },
      user: { id: user.id, name: user.full_name || user.email, role: user.role },
    });
  }

  if (result.type === 'product_opening' && result.source && result.result_items?.length) {
    const data: PendingOpeningData = {
      _type: 'opening',
      source: result.source,
      items: result.result_items,
      staff_user_id: user.id,
      staff_name: user.full_name || user.email,
    };
    return NextResponse.json({
      result: { type: 'product_opening' },
      confirmation: { type: 'product_opening', data },
      user: { id: user.id, name: user.full_name || user.email, role: user.role },
    });
  }

  if (result.type === 'stock_adjustment' && result.adjustments?.length) {
    const data: PendingStockAdjustmentData = {
      _type: 'stock_adjustment',
      adjustments: result.adjustments,
      staff_user_id: user.id,
      staff_name: user.full_name || user.email,
    };
    return NextResponse.json({
      result: { type: 'stock_adjustment' },
      confirmation: { type: 'stock_adjustment', data },
      user: { id: user.id, name: user.full_name || user.email, role: user.role },
    });
  }

  if (result.type === 'sale_cancellation' && result.order_number) {
    const data: PendingCancellationData = {
      _type: 'sale_cancellation',
      order_number: result.order_number,
      staff_user_id: user.id,
      staff_name: user.full_name || user.email,
    };
    return NextResponse.json({
      result: { type: 'sale_cancellation' },
      confirmation: { type: 'sale_cancellation', data },
      user: { id: user.id, name: user.full_name || user.email, role: user.role },
    });
  }

  // Info/error responses
  return NextResponse.json({ result });
}
