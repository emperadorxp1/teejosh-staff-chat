'use client';

import { useState } from 'react';

interface Props {
  onAction: (message: string) => void;
  disabled: boolean;
}

export default function QuickActions({ onAction, disabled }: Props) {
  const [showCashInput, setShowCashInput] = useState<'open' | 'close' | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function handleOpenCash() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/cash/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingAmount: Number(cashAmount) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        onAction(`✅ Caja abierta con S/ ${(Number(cashAmount) || 0).toFixed(2)}`);
      } else {
        onAction(`Error: ${data.error}`);
      }
    } catch {
      onAction('Error de conexion');
    } finally {
      setActionLoading(false);
      setShowCashInput(null);
      setCashAmount('');
    }
  }

  async function handleCloseCash() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/cash/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualCash: Number(cashAmount) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        const diff = data.difference;
        const diffText = diff === 0 ? 'Cuadre perfecto' : diff > 0 ? `Sobrante: S/ ${diff.toFixed(2)}` : `Faltante: S/ ${Math.abs(diff).toFixed(2)}`;
        onAction(`✅ Caja cerrada\nEfectivo esperado: S/ ${data.expected.toFixed(2)}\nEfectivo contado: S/ ${(Number(cashAmount) || 0).toFixed(2)}\n${diffText}`);
      } else {
        onAction(`Error: ${data.error}`);
      }
    } catch {
      onAction('Error de conexion');
    } finally {
      setActionLoading(false);
      setShowCashInput(null);
      setCashAmount('');
    }
  }

  async function handleDailySales() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/sales/daily');
      const summary = await res.json();

      if (summary.total_orders === 0) {
        onAction('📊 No hay ventas registradas hoy.');
      } else {
        let msg = `📊 Ventas de hoy\n\n🧾 Pedidos: ${summary.total_orders}\n📦 Items: ${summary.items_sold}\n💰 Total: S/ ${summary.total_amount.toFixed(2)}`;
        if (summary.by_payment_method) {
          const labels: Record<string, string> = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia', tarjeta: 'Tarjeta', creditos: 'Creditos' };
          msg += '\n';
          for (const [m, d] of Object.entries(summary.by_payment_method) as any) {
            msg += `\n• ${labels[m] || m}: ${d.count} — S/ ${d.amount.toFixed(2)}`;
          }
        }
        onAction(msg);
      }
    } catch {
      onAction('Error al obtener ventas');
    } finally {
      setActionLoading(false);
    }
  }

  if (showCashInput) {
    return (
      <div className="flex-shrink-0 bg-surface-100 border-t border-gray-800 px-3 py-2 flex items-center gap-2">
        <input
          type="number"
          value={cashAmount}
          onChange={(e) => setCashAmount(e.target.value)}
          placeholder={showCashInput === 'open' ? 'Monto de apertura' : 'Efectivo contado'}
          className="flex-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
          autoFocus
          inputMode="decimal"
        />
        <button
          onClick={showCashInput === 'open' ? handleOpenCash : handleCloseCash}
          disabled={actionLoading}
          className="px-4 py-2 bg-primary rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {actionLoading ? '...' : 'OK'}
        </button>
        <button
          onClick={() => { setShowCashInput(null); setCashAmount(''); }}
          className="px-3 py-2 bg-gray-700 rounded-lg text-sm"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-surface-100 border-t border-gray-800 px-3 py-2">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <QuickButton
          onClick={() => setShowCashInput('open')}
          disabled={disabled || actionLoading}
          icon="💰"
          label="Abrir caja"
        />
        <QuickButton
          onClick={handleDailySales}
          disabled={disabled || actionLoading}
          icon="📊"
          label="Ventas"
        />
        <QuickButton
          onClick={() => setShowCashInput('close')}
          disabled={disabled || actionLoading}
          icon="🔒"
          label="Cerrar caja"
        />
      </div>
    </div>
  );
}

function QuickButton({ onClick, disabled, icon, label }: {
  onClick: () => void;
  disabled: boolean;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-shrink-0 px-3 py-1.5 bg-surface-50 border border-gray-700 rounded-full text-xs text-gray-300 hover:border-primary hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap"
    >
      {icon} {label}
    </button>
  );
}
