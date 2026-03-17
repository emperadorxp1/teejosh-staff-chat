import type { Supabase, PendingOpeningData } from '../types';

export async function registerOpening(supabase: Supabase, data: PendingOpeningData) {
  try {
    const { data: sourceInv } = await supabase
      .from('inventory')
      .select('quantity, reserved_quantity')
      .eq('product_id', data.source.product_id)
      .single();

    if (!sourceInv) return { success: false, error: `Producto "${data.source.product_name}" no tiene inventario.` };

    const available = sourceInv.quantity - (sourceInv.reserved_quantity || 0);
    if (available < data.source.quantity) {
      return { success: false, error: `Stock insuficiente para "${data.source.product_name}": disponible ${available}, solicitado ${data.source.quantity}.` };
    }

    const { data: opening, error: openingError } = await supabase
      .from('product_openings')
      .insert({
        source_product_id: data.source.product_id,
        quantity_opened: data.source.quantity,
        opened_by: data.staff_user_id,
        notes: `Registrado via Staff Chat por ${data.staff_name}`,
      })
      .select('id')
      .single();

    if (openingError || !opening) return { success: false, error: 'Error al crear el registro de apertura.' };

    await supabase.from('product_opening_items').insert(
      data.items.map((item) => ({
        opening_id: opening.id,
        target_product_id: item.product_id,
        quantity: item.quantity,
      }))
    );

    const shortId = opening.id.slice(0, 8);

    await supabase
      .from('inventory')
      .update({ quantity: sourceInv.quantity - data.source.quantity })
      .eq('product_id', data.source.product_id);

    await supabase.from('inventory_movements').insert({
      product_id: data.source.product_id,
      quantity_change: -data.source.quantity,
      reason: 'adjustment',
      notes: `Apertura de producto #${shortId}`,
      created_by: data.staff_user_id,
    });

    for (const item of data.items) {
      const { data: targetInv } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .single();

      if (targetInv) {
        await supabase
          .from('inventory')
          .update({ quantity: targetInv.quantity + item.quantity })
          .eq('product_id', item.product_id);
      } else {
        await supabase.from('inventory').insert({
          product_id: item.product_id,
          quantity: item.quantity,
          reserved_quantity: 0,
          low_stock_threshold: 5,
        });
      }

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        quantity_change: item.quantity,
        reason: 'purchase',
        notes: `Apertura de producto #${shortId}`,
        created_by: data.staff_user_id,
      });
    }

    return { success: true, openingId: opening.id };
  } catch (error) {
    console.error('Register opening error:', error);
    return { success: false, error: 'Error inesperado al registrar la apertura.' };
  }
}
