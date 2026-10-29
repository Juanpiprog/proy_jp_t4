'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { db, initLocalDatabase } from '../lib/db';
import { Cliente, Producto, Categoria, Pedido } from '../types';

interface OrderFormProps {
  preventistaId: string;
  selectedCliente?: Cliente | null;
  onOrderCompleted: () => void;
  onCancel: () => void;
  onNavigateToNewCliente?: () => void;
}

export default function OrderForm({
  preventistaId,
  selectedCliente,
  onOrderCompleted,
  onCancel,
  onNavigateToNewCliente,
}: OrderFormProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>(selectedCliente?.id || '');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await initLocalDatabase();
      const cliList = await db.clientes.toArray();
      const catList = await db.categorias.toArray();
      const prodList = await db.productos.toArray();

      setClientes(cliList);
      setCategorias(catList);
      setProductos(prodList);

      if (selectedCliente) {
        setClienteId(selectedCliente.id);
      } else if (cliList.length > 0 && !clienteId) {
        setClienteId(cliList[0].id);
      }
    };
    loadData();
  }, [selectedCliente]);

  const handleQuantityChange = (productId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  // Cálculo en tiempo real de unidades totales y precio total
  const totalUnidades = Object.entries(quantities).reduce((sum, [, qty]) => sum + qty, 0);

  const totalPrecio = Object.entries(quantities).reduce((sum, [pId, qty]) => {
    const prod = productos.find((p) => p.id === Number(pId));
    return sum + (prod ? prod.precio_unitario * qty : 0);
  }, 0);

  const filteredProducts = selectedCatId
    ? productos.filter((p) => p.categoria_id === selectedCatId)
    : productos;

  const handleConfirmOrder = async () => {
    if (!clienteId) {
      alert('Por favor selecciona una tienda para tomar el pedido.');
      return;
    }
    if (totalUnidades === 0) {
      alert('Debes agregar al menos una unidad de snack al pedido.');
      return;
    }

    setSaving(true);
    try {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([pId, qty]) => {
          const prod = productos.find((p) => p.id === Number(pId))!;
          return {
            producto_id: prod.id,
            cantidad: qty,
            precio_unitario: prod.precio_unitario,
            subtotal: Number((prod.precio_unitario * qty).toFixed(2)),
          };
        });

      const nuevoPedido: Pedido = {
        id: crypto.randomUUID(),
        preventista_id: preventistaId,
        cliente_id: clienteId,
        fecha_pedido: new Date().toISOString(),
        total_unidades: totalUnidades,
        total_precio: Number(totalPrecio.toFixed(2)),
        estado: 'pendiente',
        observaciones: observaciones.trim() || undefined,
        items,
        sync_status: 'pending',
      };

      await db.pedidos.add(nuevoPedido);
      alert('¡Pedido registrado correctamente y guardado en local!');
      onOrderCompleted();
    } catch (err) {
      console.error('Error guardando pedido:', err);
      alert('Ocurrió un error al guardar el pedido en IndexedDB.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 max-w-4xl mx-auto pb-28">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-800">Toma de Preventa de Snacks</h2>
        </div>
      </div>

      {/* Selector de Cliente / Tienda */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Tienda / Cliente a Visitar *
        </label>
        {clientes.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-xs font-medium">Aún no tienes tiendas registradas. ¡Registra la primera!</span>
            </div>
            {onNavigateToNewCliente && (
              <button
                type="button"
                onClick={onNavigateToNewCliente}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition-all whitespace-nowrap"
              >
                ➕ Registrar Mi Primera Tienda
              </button>
            )}
          </div>
        ) : (
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          >
            {clientes.map((cli) => (
              <option key={cli.id} value={cli.id}>
                🏪 {cli.nombre_tienda} {cli.nombre_propietario ? `(${cli.nombre_propietario})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filtro por Categorías de Snacks */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 mb-4 scrollbar-none">
        <button
          onClick={() => setSelectedCatId(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCatId === null
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos los Snacks
        </button>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCatId === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Cuadrícula de Snacks con botones +/- para celular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {filteredProducts.map((prod) => {
          const qty = quantities[prod.id] || 0;
          return (
            <div
              key={prod.id}
              className={`p-3.5 rounded-xl border transition-all ${
                qty > 0
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xl">🥔</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                  Bs. {prod.precio_unitario.toFixed(2)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 leading-tight mb-2">
                {prod.nombre}
              </h4>

              {/* Controles de cantidad táctiles (+ / -) */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Cantidad:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(prod.id, -1)}
                    disabled={qty === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(prod.id, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Observaciones */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Observaciones de Entrega
        </label>
        <input
          type="text"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Ej. Entregar en la mañana / cobrar en efectivo"
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* Barra flotante inferior de resumen de pedido */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Unidades: <strong className="text-slate-800">{totalUnidades} bolsas</strong></p>
            <p className="text-base font-extrabold text-emerald-700">
              Monto: Bs. {totalPrecio.toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={saving || totalUnidades === 0}
            className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all text-sm disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Confirmar Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
