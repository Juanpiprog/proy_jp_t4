import { db } from './db';
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getPendingCount(): Promise<number> {
  try {
    const pendingClientes = await db.clientes.where('sync_status').equals('pending').count();
    const pendingPedidos = await db.pedidos.where('sync_status').equals('pending').count();
    return pendingClientes + pendingPedidos;
  } catch (err) {
    console.error('Error calculando pendientes:', err);
    return 0;
  }
}

export async function synchronizeData(preventistaId: string): Promise<{ success: boolean; message: string }> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Dispositivo sin conexión a internet' };
  }

  const errors: string[] = [];
  let syncedClientesCount = 0;
  let syncedPedidosCount = 0;

  try {
    // 1. Obtener clientes pendientes
    const pendingClientes = await db.clientes.where('sync_status').equals('pending').toArray();

    // 2. Subir fotos pendientes y sincronizar clientes en Supabase
    for (const cli of pendingClientes) {
      let finalPhotoUrl = cli.foto_tienda_url;

      // Subir foto si existe
      if (cli.foto_local_blob && !finalPhotoUrl && supabase) {
        try {
          const fileName = `${cli.id}.jpg`;
          const { data: uploadData, error: upErr } = await supabase.storage
            .from('tiendas')
            .upload(fileName, cli.foto_local_blob, {
              contentType: 'image/jpeg',
              upsert: true,
            });
          if (uploadData && !upErr) {
            const { data: pubUrl } = supabase.storage.from('tiendas').getPublicUrl(fileName);
            finalPhotoUrl = pubUrl.publicUrl;
            await db.clientes.update(cli.id, { foto_tienda_url: finalPhotoUrl });
          }
        } catch (e: any) {
          console.warn('Foto local no subida a storage:', e?.message);
        }
      }

      // Upsert cliente en Supabase
      if (supabase) {
        try {
          const { error: sbErr } = await supabase.from('clientes').upsert({
            id: cli.id,
            nombre_tienda: cli.nombre_tienda,
            nombre_propietario: cli.nombre_propietario,
            telefono: cli.telefono,
            direccion: cli.direccion,
            latitud: cli.latitud,
            longitud: cli.longitud,
            foto_tienda_url: finalPhotoUrl,
          });

          if (!sbErr) {
            await db.clientes.update(cli.id, { sync_status: 'synced', foto_tienda_url: finalPhotoUrl });
            syncedClientesCount++;
          } else {
            console.error('Error Supabase cliente:', sbErr);
            errors.push(`Cliente '${cli.nombre_tienda}': ${sbErr.message}`);
          }
        } catch (err: any) {
          errors.push(`Error de red en cliente '${cli.nombre_tienda}': ${err?.message}`);
        }
      }
    }

    // 3. Obtener pedidos pendientes
    const pendingPedidos = await db.pedidos.where('sync_status').equals('pending').toArray();

    // Sincronizar pedidos en Supabase
    for (const ped of pendingPedidos) {
      if (supabase) {
        try {
          const { error: pedErr } = await supabase.from('pedidos').upsert({
            id: ped.id,
            cliente_id: ped.cliente_id,
            fecha_pedido: ped.fecha_pedido || new Date().toISOString(),
            total_unidades: ped.total_unidades,
            total_precio: ped.total_precio,
            estado: ped.estado,
            observaciones: ped.observaciones,
          });

          if (!pedErr) {
            // Insertar líneas de detalle si las hay
            if (ped.items && ped.items.length > 0) {
              const detalles = ped.items.map((it) => ({
                pedido_id: ped.id,
                producto_id: it.producto_id,
                cantidad: it.cantidad,
                precio_unitario: it.precio_unitario,
                subtotal: it.subtotal,
              }));
              await supabase.from('detalle_pedidos').upsert(detalles);
            }
            await db.pedidos.update(ped.id, { sync_status: 'synced' });
            syncedPedidosCount++;
          } else {
            console.error('Error Supabase pedido:', pedErr);
            errors.push(`Pedido ${ped.id.slice(0, 6)}: ${pedErr.message}`);
          }
        } catch (err: any) {
          errors.push(`Error de red en pedido: ${err?.message}`);
        }
      }
    }

    // 4. Intentar notificar a FastAPI si está activo
    try {
      const payload = {
        preventista_id: preventistaId,
        clientes: pendingClientes.map(({ sync_status, foto_local_blob, ...rest }) => rest),
        pedidos: pendingPedidos.map(({ sync_status, cliente, ...rest }) => rest),
      };
      await fetch(`${API_URL}/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignorar si FastAPI no está encendido
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `⚠️ Supabase rechazó datos: ${errors[0]} (Revisa las políticas RLS en Supabase)`,
      };
    }

    if (syncedClientesCount === 0 && syncedPedidosCount === 0) {
      return { success: true, message: 'Todos los datos ya están al día en Supabase.' };
    }

    return {
      success: true,
      message: `✅ ¡Subida exitosa! Se guardaron ${syncedClientesCount} tiendas y ${syncedPedidosCount} pedidos en Supabase.`,
    };
  } catch (err: any) {
    console.error('Error fatal durante la sincronización:', err);
    return { success: false, message: `Error general: ${err?.message || 'Error desconocido'}` };
  }
}
