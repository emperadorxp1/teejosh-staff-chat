import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';

export async function GET() {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { serviceClient } = auth;

  // Get products with available stock, ordered by most recently updated
  const { data, error } = await serviceClient
    .from('products')
    .select(`id, name, sku, price, image_url, inventory!inner (quantity, reserved_quantity)`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data || [])
    .map((p: any) => {
      const qty = p.inventory?.quantity ?? 0;
      const reserved = p.inventory?.reserved_quantity ?? 0;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        image_url: p.image_url,
        stock: qty,
        available: qty - reserved,
      };
    })
    .filter((p: any) => p.available > 0);

  return NextResponse.json({ products });
}
