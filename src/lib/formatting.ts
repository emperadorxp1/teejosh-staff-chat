import type { PendingSaleData, PendingWithdrawalData, PendingOpeningData, PendingStockAdjustmentData, DailySalesSummary, CashMovementData } from './types';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  creditos: 'Creditos TeeJosh',
  mixto: 'Pago dividido',
  'sin especificar': 'Sin especificar',
};

const REASON_LABELS: Record<string, string> = {
  purchase: 'Reposicion/Compra',
  adjustment: 'Ajuste manual',
  damaged: 'Producto danado',
  lost: 'Producto perdido',
  return: 'Devolucion',
  initial_stock: 'Stock inicial',
};

export function getPaymentLabel(method: string): string {
  return PAYMENT_LABELS[method] || method;
}

export function getReasonLabel(reason: string): string {
  return REASON_LABELS[reason] || reason;
}

export function formatSaleConfirmation(sale: PendingSaleData) {
  return {
    title: 'Resumen de venta',
    icon: '🛒',
    items: sale.items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      availableStock: item.available_stock,
    })),
    total: sale.total,
    payments: sale.payments?.map((p) => ({
      method: getPaymentLabel(p.method),
      amount: p.amount,
    })),
    staff: sale.staff_name,
  };
}

export function formatWithdrawalConfirmation(data: PendingWithdrawalData) {
  return {
    title: 'Retiro de staff',
    icon: '🎒',
    items: data.items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      availableStock: item.available_stock,
    })),
    total: data.total,
    staff: data.staff_name,
  };
}

export function formatOpeningConfirmation(data: PendingOpeningData) {
  return {
    title: 'Apertura de producto',
    icon: '📦',
    source: {
      name: data.source.product_name,
      quantity: data.source.quantity,
      availableStock: data.source.available_stock,
    },
    resultItems: data.items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
    })),
    staff: data.staff_name,
  };
}

export function formatStockAdjustmentConfirmation(data: PendingStockAdjustmentData) {
  return {
    title: 'Ajuste de stock',
    icon: '📊',
    adjustments: data.adjustments.map((item) => ({
      name: item.product_name,
      currentStock: item.current_stock,
      newStock: item.current_stock + item.quantity_change,
      change: item.quantity_change,
      reason: getReasonLabel(item.reason),
    })),
    staff: data.staff_name,
  };
}

export function formatDailySummary(summary: DailySalesSummary): string {
  if (summary.total_orders === 0) return 'No hay ventas registradas hoy.';

  let msg = `📊 Ventas de hoy\n\n`;
  msg += `🧾 Pedidos: ${summary.total_orders}\n`;
  msg += `📦 Items vendidos: ${summary.items_sold}\n`;
  msg += `💰 Total: S/ ${summary.total_amount.toFixed(2)}\n\n`;
  msg += `Por metodo de pago:\n`;
  for (const [method, data] of Object.entries(summary.by_payment_method)) {
    const label = PAYMENT_LABELS[method] || method;
    msg += `• ${label}: ${data.count} pedido${data.count !== 1 ? 's' : ''} — S/ ${data.amount.toFixed(2)}\n`;
  }
  return msg;
}

export function formatCashMovement(data: CashMovementData): string {
  const icon = data.type === 'ingreso' ? '📥' : '📤';
  const label = data.type === 'ingreso' ? 'Ingreso' : 'Retiro';
  return `${icon} ${label} de caja registrado\n💵 Monto: S/ ${data.amount.toFixed(2)}\n📝 Motivo: ${data.reason}`;
}

export function formatTournamentInscription(
  name: string,
  participants: number,
  fee: number,
  total: number,
  method: string
): string {
  return `🏆 Inscripcion a torneo registrada\n📋 Torneo: ${name}\n👥 Participantes: ${participants}\n🎫 Costo: S/ ${fee.toFixed(2)} c/u\n💰 Total: S/ ${total.toFixed(2)}\n💳 Pago: ${getPaymentLabel(method)}`;
}
