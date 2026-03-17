import type { Supabase, PendingWithdrawalData } from '../types';

export async function registerWithdrawal(supabase: Supabase, data: PendingWithdrawalData) {
  try {
    for (const item of data.items) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity, reserved_quantity')
        .eq('product_id', item.product_id)
        .single();

      if (!inv) return { success: false, error: `Producto "${item.product_name}" no tiene inventario.` };

      const available = inv.quantity - inv.reserved_quantity;
      if (available < item.quantity) {
        return { success: false, error: `Stock insuficiente para "${item.product_name}": disponible ${available}, solicitado ${item.quantity}.` };
      }
    }

    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('staff_withdrawals')
      .insert({ staff_user_id: data.staff_user_id })
      .select('id')
      .single();

    if (withdrawalError || !withdrawal) return { success: false, error: 'Error al crear el registro de retiro.' };

    await supabase.from('staff_withdrawal_items').insert(
      data.items.map((item) => ({
        withdrawal_id: withdrawal.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
    );

    for (const item of data.items) {
      const { data: currentInv } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .single();

      if (currentInv) {
        await supabase
          .from('inventory')
          .update({ quantity: currentInv.quantity - item.quantity })
          .eq('product_id', item.product_id);
      }

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        quantity_change: -item.quantity,
        reason: 'staff_withdrawal',
        notes: `Retiro de staff - ${data.staff_name}`,
        created_by: data.staff_user_id,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Register withdrawal error:', error);
    return { success: false, error: 'Error inesperado al registrar el retiro.' };
  }
}
