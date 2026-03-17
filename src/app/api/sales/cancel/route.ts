import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { cancelSale } from '@/lib/services/sales';

export async function POST(request: Request) {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { orderNumber } = await request.json();
  if (!orderNumber) return NextResponse.json({ error: 'Falta numero de pedido' }, { status: 400 });

  const result = await cancelSale(auth.serviceClient, orderNumber);
  return NextResponse.json(result);
}
