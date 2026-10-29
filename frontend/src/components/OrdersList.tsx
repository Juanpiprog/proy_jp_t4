'use client';

import React, { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, Cloud, CloudOff } from 'lucide-react';
import { db } from '../lib/db';
import { Pedido, Cliente } from '../types';

export default function OrdersList() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, Cliente>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const pedList = await db.pedidos.reverse().toArray();
        const cliList = await db.clientes.toArray();
        const map: Record<string, Cliente> = {};
        cliList.forEach((c) => {
          map[c.id] = c;
        });

        setPedidos(pedList);
        setClientesMap(map);
      } catch (e) {
        console.error('Error cargando pedidos:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-sm text-slate-500">Cargando pedidos...</div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-2xl mx-auto">
        <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-700">Sin pedidos registrados hoy</h3>
        <p className="text-xs text-slate-500 mt-1">
          Visita una tienda o da de alta un cliente para registrar tu primera preventa.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">Historial de Pedidos Realizados</h3>
        <span className="text-xs text-slate-500 font-medium">{pedidos.length} pedidos</span>
      </div>

      {pedidos.map((ped) => {
        const cliente = clientesMap[ped.cliente_id];
        return (
          <div
            key={ped.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  🏪 {cliente?.nombre_tienda || 'Tienda registrada'}
                </h4>
                <p className="text-xs text-slate-500">
                  {cliente?.direccion || 'Sin dirección registrada'}
                </p>
              </div>

              {/* Badge de Sincronización */}
              <div
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  ped.sync_status === 'synced'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {ped.sync_status === 'synced' ? (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span>Nube</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3 h-3 text-amber-600" />
                    <span>Local (Offline)</span>
                  </>
                )}
              </div>
            </div>

            {/* Resumen de cantidades y montos */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-600">
                  📦 <strong>{ped.total_unidades}</strong> bolsas
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-extrabold text-emerald-700">
                  Bs. {ped.total_precio.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  {ped.fecha_pedido
                    ? new Date(ped.fecha_pedido).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>
            </div>

            {ped.observaciones && (
              <p className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                📝 {ped.observaciones}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
