import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { getCashSessionStatus } from '@/lib/services/sales';

export async function GET() {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const status = await getCashSessionStatus(auth.serviceClient);
  return NextResponse.json(status);
}
