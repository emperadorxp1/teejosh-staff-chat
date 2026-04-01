'use client';

import { formatSaleConfirmation, formatWithdrawalConfirmation, formatOpeningConfirmation, formatStockAdjustmentConfirmation } from '@/lib/formatting';

interface Props {
  type: string;
  data: any;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ConfirmationCard({ type, data, onConfirm, onCancel, isLoading }: Props) {
  const renderContent = () => {
    switch (type) {
      case 'sale': {
        const info = formatSaleConfirmation(data);
        return (
          <>
            <h3 className="font-bold text-white mb-3">{info.icon} {info.title}</h3>
            <div className="space-y-2">
              {info.items.map((item, i) => (
                <div key={i} className="text-sm">
                  <p className="text-white font-medium">{item.quantity}x {item.name}</p>
                  <p className="text-gray-400">
                    S/ {item.unitPrice.toFixed(2)} c/u = S/ {item.totalPrice.toFixed(2)}
                    <span className="ml-2 text-gray-500">📦 Stock: {item.availableStock}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 mt-3 pt-3">
              <p className="text-white font-bold">💰 Total: S/ {info.total.toFixed(2)}</p>
              {info.payments && (
                <div className="text-sm text-gray-400 mt-1">
                  {info.payments.length > 1 ? (
                    info.payments.map((p, i) => (
                      <p key={i}>💳 {p.method}: S/ {p.amount.toFixed(2)}</p>
                    ))
                  ) : (
                    <p>💳 {info.payments[0].method}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">👤 {info.staff}</p>
            </div>
          </>
        );
      }

      case 'staff_withdrawal': {
        const info = formatWithdrawalConfirmation(data);
        return (
          <>
            <h3 className="font-bold text-white mb-3">{info.icon} {info.title}</h3>
            <div className="space-y-2">
              {info.items.map((item, i) => (
                <div key={i} className="text-sm">
                  <p className="text-white font-medium">{item.quantity}x {item.name}</p>
                  <p className="text-gray-400">S/ {item.unitPrice.toFixed(2)} c/u = S/ {item.totalPrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 mt-3 pt-3">
              <p className="text-white font-bold">💰 Costo: S/ {info.total.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">👤 {info.staff}</p>
            </div>
          </>
        );
      }

      case 'product_opening': {
        const info = formatOpeningConfirmation(data);
        return (
          <>
            <h3 className="font-bold text-white mb-3">{info.icon} {info.title}</h3>
            <div className="text-sm mb-2">
              <p className="text-gray-400 text-xs uppercase mb-1">Producto a abrir</p>
              <p className="text-white font-medium">{info.source.quantity}x {info.source.name}</p>
              <p className="text-gray-500 text-xs">📦 Stock: {info.source.availableStock}</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-400 text-xs uppercase mb-1">Productos resultantes</p>
              {info.resultItems.map((item, i) => (
                <p key={i} className="text-white">{item.quantity}x {item.name}</p>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-700">👤 {info.staff}</p>
          </>
        );
      }

      case 'stock_adjustment': {
        const info = formatStockAdjustmentConfirmation(data);
        return (
          <>
            <h3 className="font-bold text-white mb-3">{info.icon} {info.title}</h3>
            <div className="space-y-2">
              {info.adjustments.map((item, i) => {
                const isIncrease = item.change > 0;
                return (
                  <div key={i} className="text-sm">
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-gray-400">
                      {isIncrease ? '📈' : '📉'} {item.currentStock} → {item.newStock}
                      <span className={isIncrease ? 'text-green-400' : 'text-red-400'}>
                        {' '}({isIncrease ? '+' : ''}{item.change})
                      </span>
                    </p>
                    <p className="text-gray-500 text-xs">📝 {item.reason}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-700">👤 {info.staff}</p>
          </>
        );
      }

      case 'sale_cancellation': {
        return (
          <>
            <h3 className="font-bold text-red-400 mb-3">⚠️ Cancelar Venta</h3>
            <div className="text-sm">
              <p className="text-white font-medium">Pedido: {data.order_number}</p>
              <p className="text-gray-400 mt-2">
                Se cancelara la venta y se restaurara el stock de todos los productos.
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-700">👤 {data.staff_name}</p>
          </>
        );
      }

      default:
        return <p className="text-gray-400">Operacion desconocida</p>;
    }
  };

  return (
    <div className="flex justify-start">
      <div className="bg-surface-50 border border-primary/30 rounded-2xl px-4 py-3 max-w-[90%] w-full">
        {renderContent()}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
          >
            {isLoading ? 'Procesando...' : '✅ Confirmar'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
          >
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
