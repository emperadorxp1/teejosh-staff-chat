import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { closeCashSession } from '@/lib/services/sales';

export async function POST(request: Request) {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { actualCash, notes } = await request.json();
  if (actualCash == null) return NextResponse.json({ error: 'Falta monto de efectivo' }, { status: 400 });

  const result = await closeCashSession(auth.serviceClient, auth.user.id, actualCash, notes);
  return NextResponse.json(result);
}
