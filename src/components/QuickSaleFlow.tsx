'use client';

import { useState, useEffect } from 'react';
import type { StaffUser, PaymentMethod } from '@/lib/types';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string | null;
  stock: number;
  available: number;
}

interface QuickSaleFlowProps {
  onComplete: (saleData: any) => void;
  onCancel: () => void;
  user: StaffUser;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transfer.' },
  { value: 'creditos', label: 'Creditos' },
];

export default function QuickSaleFlow({ onComplete, onCancel, user }: QuickSaleFlowProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('efectivo');
  const [isSplit, setIsSplit] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod; amount: string }[]>([
    { method: 'efectivo', amount: '' },
    { method: 'yape', amount: '' },
  ]);

  useEffect(() => {
    fetch('/api/products/hot')
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  function selectProduct(product: Product) {
    setSelected(product);
    setQuantity(1);
    setUnitPrice(product.price.toString());
  }

  function handleSubmit() {
    if (!selected) return;
    const price = Number(unitPrice) || selected.price;
    const total = quantity * price;

    let payments: { method: PaymentMethod; amount: number }[];
    let paymentMethod: PaymentMethod | 'mixto';

    if (isSplit) {
      payments = splitPayments
        .filter((p) => Number(p.amount) > 0)
        .map((p) => ({ method: p.method, amount: Number(p.amount) }));
      if (payments.length === 0) {
        payments = [{ method: 'efectivo', amount: total }];
        paymentMethod = 'efectivo';
      } else {
        paymentMethod = payments.length > 1 ? 'mixto' : payments[0].method;
      }
    } else {
      payments = [{ method: payment, amount: total }];
      paymentMethod = payment;
    }

    onComplete({
      items: [
        {
          product_id: selected.id,
          product_name: selected.name,
          product_sku: selected.sku,
          quantity,
          unit_price: price,
          total_price: total,
          available_stock: selected.available,
        },
      ],
      payment_method: paymentMethod,
      payments,
      total,
      staff_user_id: user.id,
      staff_name: user.full_name || user.email,
    });
  }

  // Step 2: Product details
  if (selected) {
    const price = Number(unitPrice) || selected.price;
    const total = quantity * price;

    return (
      <div className="fixed inset-0 z-50 bg-surface flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-surface-50 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="text-gray-400 hover:text-white text-lg"
          >
            &larr;
          </button>
          <h2 className="text-sm font-semibold text-white truncate">{selected.name}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Product info */}
          <div className="flex items-center gap-3 bg-surface-50 rounded-xl p-3 border border-gray-800">
            {selected.image_url ? (
              <img src={selected.image_url} alt="" className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl">
                📦
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{selected.name}</p>
              <p className="text-gray-500 text-xs">{selected.sku}</p>
              <p className="text-primary-300 text-xs mt-1">
                Stock disponible: {selected.available}
              </p>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Cantidad</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 bg-surface-50 border border-gray-700 rounded-xl text-white text-lg hover:border-primary flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(selected.available, Number(e.target.value) || 1));
                  setQuantity(v);
                }}
                className="w-20 text-center bg-surface border border-gray-700 rounded-xl px-3 py-2 text-white text-lg font-medium focus:outline-none focus:border-primary"
                min={1}
                max={selected.available}
              />
              <button
                onClick={() => setQuantity(Math.min(selected.available, quantity + 1))}
                className="w-10 h-10 bg-surface-50 border border-gray-700 rounded-xl text-white text-lg hover:border-primary flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Precio unitario (S/)</label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder={selected.price.toFixed(2)}
              className="w-full bg-surface border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
              inputMode="decimal"
              step="0.01"
            />
          </div>

          {/* Payment method */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">Medio de pago</label>
              <button
                onClick={() => setIsSplit(!isSplit)}
                className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${
                  isSplit
                    ? 'bg-primary/20 border-primary text-primary-300'
                    : 'bg-surface-50 border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {isSplit ? 'Pago simple' : 'Dividir pago'}
              </button>
            </div>

            {!isSplit ? (
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPayment(m.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      payment === m.value
                        ? 'bg-primary/20 border-primary text-primary-300'
                        : 'bg-surface-50 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {splitPayments.map((sp, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={sp.method}
                      onChange={(e) => {
                        const updated = [...splitPayments];
                        updated[idx].method = e.target.value as PaymentMethod;
                        setSplitPayments(updated);
                      }}
                      className="flex-1 bg-surface border border-gray-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={sp.amount}
                      onChange={(e) => {
                        const updated = [...splitPayments];
                        updated[idx].amount = e.target.value;
                        setSplitPayments(updated);
                      }}
                      placeholder="S/ 0.00"
                      className="w-24 bg-surface border border-gray-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                      inputMode="decimal"
                    />
                    {splitPayments.length > 2 && (
                      <button
                        onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                        className="text-gray-500 hover:text-red-400 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {splitPayments.length < 4 && (
                  <button
                    onClick={() => setSplitPayments([...splitPayments, { method: 'efectivo', amount: '' }])}
                    className="text-xs text-primary-300 hover:text-primary-200"
                  >
                    + Agregar metodo
                  </button>
                )}
                {(() => {
                  const splitTotal = splitPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  const diff = total - splitTotal;
                  if (diff !== 0 && splitPayments.some((p) => Number(p.amount) > 0)) {
                    return (
                      <p className={`text-xs ${diff > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {diff > 0 ? `Falta: S/ ${diff.toFixed(2)}` : `Excede: S/ ${Math.abs(diff).toFixed(2)}`}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-surface-50 rounded-xl p-4 border border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total</span>
              <span className="text-white text-xl font-bold">S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 bg-surface-50 border-t border-gray-800 px-4 py-3 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-primary hover:bg-primary-600 rounded-xl text-sm font-medium text-white transition-colors"
          >
            Registrar venta
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Product selection
  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-surface-50 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Venta rapida
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-sm">
          Cerrar
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-4 py-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full bg-surface border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary"
          autoFocus
        />
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            {search ? 'No se encontraron productos' : 'No hay productos disponibles'}
          </p>
        ) : (
          filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => selectProduct(product)}
              className="w-full flex items-center gap-3 bg-surface-50 border border-gray-800 rounded-xl p-3 hover:border-primary transition-colors text-left"
            >
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                  📦
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{product.name}</p>
                <p className="text-gray-500 text-xs">{product.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-primary-300 text-sm font-medium">S/ {product.price.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">{product.available} disp.</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
