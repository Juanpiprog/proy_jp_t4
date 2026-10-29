'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  DollarSign,
  Package,
  Store,
  Users,
  MapPin,
  Search,
  X,
  Phone,
  Navigation,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Pedido, Cliente } from '../types';

export default function GerenciaDashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTienda, setSelectedTienda] = useState<Cliente | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  const loadData = async () => {
    try {
      // 1. Cargar datos locales de IndexedDB como base rápida
      let pedList = await db.pedidos.toArray();
      let cliList = await db.clientes.toArray();

      // 2. Si hay conexión, consultar datos remotos en Supabase para tener lo más fresco
      if (typeof window !== 'undefined' && navigator.onLine && supabase) {
        try {
          const { data: remoteCli } = await supabase
            .from('clientes')
            .select('*')
            .order('created_at', { ascending: false });

          if (remoteCli && remoteCli.length > 0) {
            cliList = remoteCli;
          }

          const { data: remotePed } = await supabase
            .from('pedidos')
            .select('*')
            .order('fecha_pedido', { ascending: false });

          if (remotePed && remotePed.length > 0) {
            pedList = remotePed;
          }
        } catch (sbErr) {
          console.warn('Aviso: Usando datos locales para gerencia:', sbErr);
        }
      }

      setPedidos(pedList);
      setClientes(cliList);
    } catch (err) {
      console.error('Error cargando datos de gerencia:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtrado de tiendas en tiempo real por nombre, dueño o dirección
  const filteredClientes = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const nombre = (c.nombre_tienda || '').toLowerCase();
      const dueno = (c.nombre_propietario || '').toLowerCase();
      const dir = (c.direccion || '').toLowerCase();
      const tel = (c.telefono || '').toLowerCase();
      return nombre.includes(q) || dueno.includes(q) || dir.includes(q) || tel.includes(q);
    });
  }, [clientes, searchTerm]);

  // Inicializar o actualizar el mapa con Leaflet
  useEffect(() => {
    if (!loading && mapContainerRef.current) {
      import('leaflet').then((L) => {
        if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current!).setView([-17.3935, -66.1570], 13);
          mapInstanceRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);
        }

        const map = mapInstanceRef.current;

        // Limpiar marcadores previos
        Object.values(markersRef.current).forEach((m: any) => m.remove());
        markersRef.current = {};

        const customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        // Dibujar solo las tiendas que coinciden con el filtro
        const bounds: [number, number][] = [];

        filteredClientes.forEach((cli) => {
          if (cli.latitud && cli.longitud) {
            bounds.push([cli.latitud, cli.longitud]);
            const marker = L.marker([cli.latitud, cli.longitud], { icon: customIcon }).addTo(map);

            const popupHtml = `
              <div style="font-family: sans-serif; font-size: 12px; min-width: 160px;">
                ${
                  cli.foto_tienda_url
                    ? `<img src="${cli.foto_tienda_url}" alt="Fachada" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />`
                    : ''
                }
                <strong style="color: #065f46; font-size: 13px;">🏪 ${cli.nombre_tienda}</strong><br/>
                ${cli.nombre_propietario ? `<span style="color: #475569;">Dueño:</span> ${cli.nombre_propietario}<br/>` : ''}
                ${cli.direccion ? `<span style="color: #475569;">Dir:</span> ${cli.direccion}<br/>` : ''}
                ${cli.telefono ? `<span style="color: #475569;">Tel:</span> ${cli.telefono}` : ''}
              </div>
            `;

            marker.bindPopup(popupHtml);
            markersRef.current[cli.id] = marker;
          }
        });

        // Ajustar el zoom si hay marcadores filtrados
        if (bounds.length > 0 && searchTerm.trim() !== '') {
          map.fitBounds(bounds, { maxZoom: 16, padding: [40, 40] });
        }
      });
    }
  }, [loading, filteredClientes, searchTerm]);

  // Enfocar una tienda específica en el mapa al hacer clic
  const handleFocusTienda = (tienda: Cliente) => {
    setSelectedTienda(tienda);
    if (mapInstanceRef.current && tienda.latitud && tienda.longitud) {
      mapInstanceRef.current.flyTo([tienda.latitud, tienda.longitud], 17, {
        duration: 1.2,
      });

      const marker = markersRef.current[tienda.id];
      if (marker) {
        marker.openPopup();
      }

      // Scroll suave hacia el mapa si está lejos
      if (mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const totalVentas = pedidos.reduce((acc, p) => acc + (Number(p.total_precio) || 0), 0);
  const totalBolsas = pedidos.reduce((acc, p) => acc + (Number(p.total_unidades) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabecera con título y botón de refrescar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Panel de Control Gerencial</h2>
          <p className="text-xs text-slate-500">Métricas globales de preventa, monitoreo de tiendas y cobertura de rutas.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 shadow-sm transition-all self-start sm:self-auto"
          title="Actualizar datos desde Supabase"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar Datos'}</span>
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ventas Totales</p>
            <p className="text-lg font-black text-slate-800">Bs. {totalVentas.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Snacks Colocados</p>
            <p className="text-lg font-black text-slate-800">{totalBolsas} bolsas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Puntos de Venta</p>
            <p className="text-lg font-black text-slate-800">{clientes.length} tiendas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pedidos Tomados</p>
            <p className="text-lg font-black text-slate-800">{pedidos.length}</p>
          </div>
        </div>
      </div>

      {/* Buscador de Tiendas */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>Buscador y Directorio de Tiendas</span>
            </h3>
            <p className="text-xs text-slate-500">
              Encuentra rápidamente cualquier tienda registrada y ubícala en el mapa.
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full self-start sm:self-auto">
            {filteredClientes.length} de {clientes.length} tiendas
          </span>
        </div>

        {/* Input de Búsqueda */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe el nombre de la tienda, dueño o calle (ej: Barato, Rosa, Sucre)..."
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 placeholder-slate-400 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lista / Grid de Tiendas Filtradas */}
        {filteredClientes.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No se encontraron tiendas que coincidan con &quot;<strong className="text-slate-600">{searchTerm}</strong>&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredClientes.map((cli) => {
              const isSelected = selectedTienda?.id === cli.id;
              return (
                <div
                  key={cli.id}
                  onClick={() => handleFocusTienda(cli)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 hover:shadow-md ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  {/* Foto miniatura o placeholder */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                    {cli.foto_tienda_url ? (
                      <img
                        src={cli.foto_tienda_url}
                        alt={cli.nombre_tienda}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback si la imagen no carga
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Store className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* Datos de la tienda */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={cli.nombre_tienda}>
                        {cli.nombre_tienda}
                      </h4>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 shrink-0">
                        <Navigation className="w-3 h-3" />
                        <span>Ver</span>
                      </span>
                    </div>

                    {cli.nombre_propietario && (
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        Dueño(a): <span className="font-medium">{cli.nombre_propietario}</span>
                      </p>
                    )}

                    {cli.direccion && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5" title={cli.direccion}>
                        {cli.direccion}
                      </p>
                    )}

                    {cli.telefono && (
                      <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{cli.telefono}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mapa de Cobertura de Tiendas */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Mapa de Cobertura de Tiendas Registradas</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Haz clic en los pines para ver detalles y fotos
          </span>
        </div>

        <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Tabla de Auditoría de Preventas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Auditoría de Preventas Realizadas</h3>
          <span className="text-xs text-slate-400 font-medium">{pedidos.length} pedidos registrados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-3">ID Pedido</th>
                <th className="p-3">Unidades</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    No hay pedidos para mostrar
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium text-slate-800">{p.id.slice(0, 8)}...</td>
                    <td className="p-3 font-bold text-slate-700">{p.total_unidades} bolsas</td>
                    <td className="p-3 font-bold text-emerald-700">Bs. {Number(p.total_precio).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {p.estado}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {p.fecha_pedido ? new Date(p.fecha_pedido).toLocaleDateString() : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
