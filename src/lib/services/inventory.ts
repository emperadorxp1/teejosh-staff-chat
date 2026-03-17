import type { Supabase, PendingStockAdjustmentData } from '../types';

export async function adjustStock(supabase: Supabase, data: PendingStockAdjustmentData) {
  try {
    for (const item of data.adjustments) {
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .single();

      if (inventoryError) {
        if (inventoryError.code === 'PGRST116') {
          if (item.quantity_change <= 0) {
            return { success: false, error: `No existe inventario para ${item.product_name} y no se puede descontar.` };
          }

          await supabase.from('inventory').insert({
            product_id: item.product_id,
            quantity: item.quantity_change,
            low_stock_threshold: 5,
          });

          await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            quantity_change: item.quantity_change,
            reason: 'initial_stock',
            notes: `Inventario inicial via Staff Chat por ${data.staff_name}`,
            created_by: data.staff_user_id,
          });
          continue;
        }
        return { success: false, error: `Error al obtener inventario de ${item.product_name}` };
      }

      const newQuantity = inventory.quantity + item.quantity_change;
      if (newQuantity < 0) {
        return { success: false, error: `Stock insuficiente para ${item.product_name}. Stock actual: ${inventory.quantity}, cambio: ${item.quantity_change}` };
      }

      await supabase
        .from('inventory')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', inventory.id);

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        quantity_change: item.quantity_change,
        reason: item.reason,
        notes: `Ajuste via Staff Chat por ${data.staff_name}`,
        created_by: data.staff_user_id,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Adjust stock error:', error);
    return { success: false, error: 'Error al ajustar stock' };
  }
}
