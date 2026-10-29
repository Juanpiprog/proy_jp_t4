'use client';

import React, { useState } from 'react';
import { Camera, Store, User, Phone, MapPinCheck, CheckCircle2, ShoppingCart, PlusCircle } from 'lucide-react';
import MapPicker from './MapPicker';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Cliente } from '../types';

interface ClienteFormProps {
  preventistaId: string;
  onClienteCreated: (cliente: Cliente) => void;
}

// Generador de UUID compatible con cualquier navegador/dispositivo
const generateSafeUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function ClienteForm({ preventistaId, onClienteCreated }: ClienteFormProps) {
  const [nombreTienda, setNombreTienda] = useState('');
  const [nombrePropietario, setNombrePropietario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -17.3935,
    lng: -66.1570,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCliente, setSavedCliente] = useState<Cliente | null>(null);

  // Manejo de captura de foto desde cámara o archivo
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoBlob(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const resetForm = () => {
    setNombreTienda('');
    setNombrePropietario('');
    setTelefono('');
    setDireccion('');
    setPhotoPreview(null);
    setPhotoBlob(null);
    setSavedCliente(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreTienda.trim()) {
      alert('Por favor introduce el nombre de la tienda.');
      return;
    }

    setSaving(true);
    try {
      const clientId = generateSafeUUID();
      let remotePhotoUrl: string | undefined = undefined;

      // Si se seleccionó una foto, subirla a Supabase Storage
      if (photoBlob) {
        if (!supabase) {
          alert('Aviso: Cliente de Supabase no configurado.');
        } else {
          try {
            const fileName = `${clientId}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('tiendas')
              .upload(fileName, photoBlob, {
                contentType: photoBlob.type || 'image/jpeg',
                upsert: false,
              });

            if (uploadError) {
              console.error('Error detallado al subir imagen a Supabase Storage:', uploadError);
              alert(`⚠️ Error al subir foto a Supabase:\n${uploadError.message}`);
            } else if (uploadData) {
              const { data: pubData } = supabase.storage.from('tiendas').getPublicUrl(fileName);
              remotePhotoUrl = pubData.publicUrl;
              console.log('✅ Foto subida exitosamente:', remotePhotoUrl);
            }
          } catch (storageErr: any) {
            console.error('Excepción al subir foto:', storageErr);
            alert(`⚠️ Error de red al subir foto: ${storageErr?.message || storageErr}`);
          }
        }
      }

      const nuevoCliente: Cliente = {
        id: clientId,
        preventista_id: preventistaId,
        nombre_tienda: nombreTienda.trim(),
        nombre_propietario: nombrePropietario.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        latitud: coords.lat,
        longitud: coords.lng,
        foto_tienda_url: remotePhotoUrl,
        foto_local_blob: photoBlob || undefined,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
      };

      // 1. Guardar en base de datos local (IndexedDB)
      await db.clientes.add(nuevoCliente);

      // 2. Intentar guardar en Supabase directamente si hay conexión
      if (typeof window !== 'undefined' && navigator.onLine && supabase) {
        try {
          const { error: sbError } = await supabase.from('clientes').insert({
            id: nuevoCliente.id,
            preventista_id: nuevoCliente.preventista_id,
            nombre_tienda: nuevoCliente.nombre_tienda,
            nombre_propietario: nuevoCliente.nombre_propietario,
            telefono: nuevoCliente.telefono,
            direccion: nuevoCliente.direccion,
            latitud: nuevoCliente.latitud,
            longitud: nuevoCliente.longitud,
            foto_tienda_url: nuevoCliente.foto_tienda_url,
          });

          if (!sbError) {
            nuevoCliente.sync_status = 'synced';
            await db.clientes.update(nuevoCliente.id, { sync_status: 'synced' });
          } else {
            console.warn('Guardado localmente. Supabase respondió:', sbError.message);
          }
        } catch (sbEx) {
          console.warn('Guardado localmente. No se pudo conectar a Supabase en este momento:', sbEx);
        }
      }

      setSavedCliente(nuevoCliente);
    } catch (err: any) {
      console.error('Error guardando cliente:', err);
      alert(`Error al registrar tienda: ${err?.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  // Si la tienda ya fue creada, mostrar pantalla de confirmación amigable
  if (savedCliente) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-md p-6 max-w-xl mx-auto text-center space-y-4 animate-fadeIn">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">¡Tienda Registrada con Éxito!</h3>
        <p className="text-sm text-slate-600">
          La tienda <strong className="text-emerald-700">{savedCliente.nombre_tienda}</strong> quedó guardada{' '}
          {savedCliente.sync_status === 'synced' ? (
            <span className="text-emerald-700 font-semibold">(sincronizada en Supabase)</span>
          ) : (
            <span className="text-amber-700 font-semibold">(en memoria local lista para preventa)</span>
          )}.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onClienteCreated(savedCliente)}
            className="flex items-center justify-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Tomar Pedido a esta Tienda</span>
          </button>
          <button
            onClick={resetForm}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Otra Tienda</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <Store className="w-5 h-5 text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">Alta de Nueva Tienda / Cliente</h2>
          <p className="text-xs text-slate-500">Registra el punto de venta con ubicación GPS y fachada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre de la tienda */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Nombre de la Tienda *
          </label>
          <div className="relative">
            <Store className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              required
              value={nombreTienda}
              onChange={(e) => setNombreTienda(e.target.value)}
              placeholder="Ej. Abarrotes Doña Rosa"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Propietario y Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nombre del Dueño(a)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={nombrePropietario}
                onChange={(e) => setNombrePropietario(e.target.value)}
                placeholder="Ej. Rosa Gómez"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Teléfono / WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 76543210"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Dirección descriptiva */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Dirección / Referencia
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej. Calle Junín esquina Sucre frente al colegio"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Mapa con Pin Interactivo */}
        <div className="pt-2">
          <MapPicker
            lat={coords.lat}
            lng={coords.lng}
            onChange={(newCoords) => setCoords(newCoords)}
          />
        </div>

        {/* Fotografía de la fachada de la tienda */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Fotografía de la Tienda (Fachada)
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 text-xs font-semibold transition-all">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Tomar Foto / Subir Imagen</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </label>

            {photoPreview && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
                <img
                  src={photoPreview}
                  alt="Vista previa fachada"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Botón de Enviar */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-md transition-all text-sm disabled:opacity-50"
          >
            <MapPinCheck className="w-4 h-4" />
            {saving ? 'Guardando tienda...' : 'Guardar Tienda'}
          </button>
        </div>
      </form>
    </div>
  );
}
