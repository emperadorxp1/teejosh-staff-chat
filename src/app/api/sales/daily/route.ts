import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { getDailySalesSummary } from '@/lib/services/sales';

export async function GET() {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const summary = await getDailySalesSummary(auth.serviceClient);
  return NextResponse.json(summary);
}
