import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { registerSale } from '@/lib/services/sales';
import { registerWithdrawal } from '@/lib/services/withdrawals';
import { registerOpening } from '@/lib/services/openings';
import { adjustStock } from '@/lib/services/inventory';

export async function POST(request: Request) {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { type, data } = await request.json();
  const { serviceClient } = auth;

  switch (type) {
    case 'sale': {
      const result = await registerSale(serviceClient, data);
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Venta registrada: ${result.orderNumber}\nTotal: S/ ${data.total.toFixed(2)}`,
        });
      }
      return NextResponse.json({ success: false, error: result.error });
    }

    case 'staff_withdrawal': {
      const result = await registerWithdrawal(serviceClient, data);
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Retiro de staff registrado\nCosto: S/ ${data.total.toFixed(2)}`,
        });
      }
      return NextResponse.json({ success: false, error: result.error });
    }

    case 'product_opening': {
      const result = await registerOpening(serviceClient, data);
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Apertura registrada\n${data.source.quantity}x ${data.source.product_name}`,
        });
      }
      return NextResponse.json({ success: false, error: result.error });
    }

    case 'stock_adjustment': {
      if (auth.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Solo administradores pueden ajustar stock.' });
      }
      const result = await adjustStock(serviceClient, data);
      if (result.success) {
        const summary = data.adjustments
          .map((a: any) => `${a.product_name}: ${a.current_stock} -> ${a.current_stock + a.quantity_change}`)
          .join('\n');
        return NextResponse.json({
          success: true,
          message: `Ajuste de stock registrado\n${summary}`,
        });
      }
      return NextResponse.json({ success: false, error: result.error });
    }

    default:
      return NextResponse.json({ success: false, error: 'Tipo de confirmacion invalido' }, { status: 400 });
  }
}
