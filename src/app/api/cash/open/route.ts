import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { openCashSession } from '@/lib/services/sales';

export async function POST(request: Request) {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { openingAmount = 0 } = await request.json();
  const result = await openCashSession(auth.serviceClient, auth.user.id, openingAmount);

  return NextResponse.json(result);
}
