import Dexie, { Table } from 'dexie';
import { Cliente, Pedido, Producto, Categoria } from '../types';

export class PreventaDatabase extends Dexie {
  clientes!: Table<Cliente, string>;
  pedidos!: Table<Pedido, string>;
  productos!: Table<Producto, number>;
  categorias!: Table<Categoria, number>;

  constructor() {
    super('PreventaSnacksDB');
    this.version(1).stores({
      clientes: 'id, preventista_id, nombre_tienda, sync_status',
      pedidos: 'id, preventista_id, cliente_id, sync_status, fecha_pedido',
      productos: 'id, categoria_id, nombre, precio_unitario',
      categorias: 'id, nombre'
    });
  }
}

export const db = new PreventaDatabase();

// Datos iniciales de catálogo por defecto para cuando no hay conexión inicial
export const SEED_CATEGORIAS: Categoria[] = [
  { id: 1, nombre: 'Papas Fritas', descripcion: 'Papas tradicionales y onduladas' },
  { id: 2, nombre: 'Pipocas', descripcion: 'Pipocas dulces y saladas' },
  { id: 3, nombre: 'Platanitos', descripcion: 'Plátano salado y dulce maduro' },
  { id: 4, nombre: 'Extruidos / Chizitos', descripcion: 'Snacks de maíz horneados con queso' },
];

export const SEED_PRODUCTOS: Producto[] = [
  { id: 1, categoria_id: 1, nombre: 'Papas Clásicas 50g', precio_unitario: 5.00, activo: true },
  { id: 2, categoria_id: 1, nombre: 'Papas Onduladas Picantes 50g', precio_unitario: 5.50, activo: true },
  { id: 3, categoria_id: 2, nombre: 'Pipocas Dulces 70g', precio_unitario: 3.50, activo: true },
  { id: 4, categoria_id: 2, nombre: 'Pipocas Mantequilla 70g', precio_unitario: 4.00, activo: true },
  { id: 5, categoria_id: 3, nombre: 'Platanitos Salados 60g', precio_unitario: 4.50, activo: true },
  { id: 6, categoria_id: 4, nombre: 'Chizitos de Queso 45g', precio_unitario: 3.00, activo: true },
];

export async function initLocalDatabase() {
  const catCount = await db.categorias.count();
  if (catCount === 0) {
    await db.categorias.bulkAdd(SEED_CATEGORIAS);
  }
  const prodCount = await db.productos.count();
  if (prodCount === 0) {
    await db.productos.bulkAdd(SEED_PRODUCTOS);
  }
}
