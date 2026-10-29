export type UserRole = 'gerente' | 'preventista';

export interface Usuario {
  id: string;
  nombre_completo: string;
  telefono?: string;
  rol: UserRole;
  activo: boolean;
  email?: string;
}

export interface Cliente {
  id: string;
  preventista_id: string;
  nombre_tienda: string;
  nombre_propietario?: string;
  telefono?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  foto_tienda_url?: string;
  foto_local_blob?: Blob | string; // Para almacenamiento offline en IndexedDB
  sync_status?: 'synced' | 'pending';
  created_at?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id: number;
  categoria_id?: number;
  nombre: string;
  descripcion?: string;
  precio_unitario: number;
  foto_url?: string;
  activo: boolean;
  categoria?: Categoria;
}

export interface DetallePedidoItem {
  id?: number;
  producto_id: number;
  producto?: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  preventista_id: string;
  cliente_id: string;
  cliente?: Cliente;
  fecha_pedido?: string;
  total_unidades: number;
  total_precio: number;
  estado: 'pendiente' | 'confirmado' | 'entregado' | 'cancelado';
  observaciones?: string;
  items: DetallePedidoItem[];
  sync_status?: 'synced' | 'pending';
}
