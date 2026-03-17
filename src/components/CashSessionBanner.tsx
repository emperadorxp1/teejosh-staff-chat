'use client';

import { useEffect, useState } from 'react';

interface Props {
  refreshTrigger: number;
}

interface CashStatus {
  isOpen: boolean;
  sessionId?: string;
  openingAmount?: number;
  openedAt?: string;
  ingresos?: number;
  retiros?: number;
  movementCount?: number;
}

export default function CashSessionBanner({ refreshTrigger }: Props) {
  const [status, setStatus] = useState<CashStatus | null>(null);

  useEffect(() => {
    fetch('/api/cash/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ isOpen: false }));
  }, [refreshTrigger]);

  if (!status) return null;

  if (!status.isOpen) {
    return (
      <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-yellow-400">⚠️ Caja cerrada</span>
      </div>
    );
  }

  const time = status.openedAt
    ? new Date(status.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="flex-shrink-0 bg-green-500/10 border-b border-green-500/20 px-4 py-2 flex items-center justify-between">
      <span className="text-xs text-green-400">
        ✅ Caja abierta {time && `desde ${time}`}
        {status.openingAmount ? ` — Apertura: S/ ${status.openingAmount.toFixed(2)}` : ''}
      </span>
      {status.movementCount != null && status.movementCount > 0 && (
        <span className="text-xs text-gray-500">
          {status.movementCount} mov.
        </span>
      )}
    </div>
  );
}
