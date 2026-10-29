# 🗄️ 02. Modelo de Base de Datos y Supabase

Este documento detalla la estructura de la base de datos PostgreSQL alojada en **Supabase**, sus tablas, tipos de datos, relaciones y reglas de seguridad.

---

## 1. Diagrama Entidad-Relación (ER)

```
┌─────────────────────┐          1:N         ┌─────────────────────┐
│      usuarios       ├─────────────────────►│      clientes       │
│─────────────────────│                      │─────────────────────│
│ id (PK, UUID)       │                      │ id (PK, UUID)       │
│ nombre_completo     │                      │ preventista_id (FK) │
│ telefono            │                      │ nombre_tienda       │
│ rol ('gerente'|...) │                      │ latitud, longitud   │
│ activo              │                      │ foto_tienda_url     │
└──────────┬──────────┘                      └──────────┬──────────┘
           │ 1:N                                        │ 1:N
           ▼                                            ▼
┌────────────────────────────────────────────────────────┐
│                        pedidos                         │
│────────────────────────────────────────────────────────│
│ id (PK, UUID)                                          │
│ preventista_id (FK -> usuarios.id)                     │
│ cliente_id (FK -> clientes.id)                         │
│ fecha_pedido, total_unidades, total_precio, estado     │
└──────────────────────────┬─────────────────────────────┘
                           │ 1:N
                           ▼
┌────────────────────────────────────────────────────────┐
│                    detalle_pedidos                     │
│────────────────────────────────────────────────────────│
│ id (PK, BIGINT)                                        │
│ pedido_id (FK -> pedidos.id ON DELETE CASCADE)         │
│ producto_id (FK -> productos.id)                       │
│ cantidad, precio_unitario, subtotal                    │
└──────────────────────────▲─────────────────────────────┘
                           │ N:1
┌──────────────────────────┴──────────┐      N:1     ┌─────────────────────┐
│              productos              ├─────────────►│     categorias      │
│─────────────────────────────────────│              │─────────────────────│
│ id (PK, BIGINT)                     │              │ id (PK, BIGINT)     │
│ categoria_id (FK -> categorias.id)  │              │ nombre              │
│ nombre, precio_unitario, foto_url   │              │ descripcion         │
└─────────────────────────────────────┘              └─────────────────────┘
```

---

## 2. Diccionario de Datos

### Tabla: `usuarios`
Extiende la tabla interna `auth.users` de Supabase para almacenar la información operativa de los empleados de la empresa.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `UUID` | No | Clave primaria. Idéntica al ID de `auth.users`. |
| `nombre_completo`| `VARCHAR(150)`| No | Nombre y apellido del trabajador. |
| `telefono` | `VARCHAR(20)` | Sí | Teléfono celular de contacto. |
| `rol` | `VARCHAR(20)` | No | Restricción: solo `'gerente'` o `'preventista'`. |
| `activo` | `BOOLEAN` | No | `true` si el empleado puede operar en el sistema. |
| `created_at` | `TIMESTAMPTZ` | No | Fecha y hora de creación del registro. |

---

### Tabla: `clientes`
Representa los puntos de venta o tiendas de abarrotes registradas por los preventistas.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `UUID` | No | Clave primaria autogenerada (`gen_random_uuid()`). |
| `preventista_id` | `UUID` | No | Clave foránea que referencia a `usuarios.id`. |
| `nombre_tienda` | `VARCHAR(150)`| No | Nombre comercial de la tienda (ej. "Minimarket Sol"). |
| `nombre_propietario`| `VARCHAR(150)`| Sí | Nombre de la persona encargada o dueña. |
| `telefono` | `VARCHAR(20)` | Sí | Número de WhatsApp o teléfono del cliente. |
| `direccion` | `TEXT` | Sí | Referencia escrita de la calle o zona. |
| `latitud` | `NUMERIC(10,8)`| Sí | Coordenada GPS de latitud para el mapa. |
| `longitud` | `NUMERIC(11,8)`| Sí | Coordenada GPS de longitud para el mapa. |
| `foto_tienda_url` | `TEXT` | Sí | Enlace a la imagen en el bucket `tiendas`. |
| `created_at` | `TIMESTAMPTZ` | No | Fecha y hora de registro. |

---

### Tabla: `categorias`
Clasificación de los tipos de snacks que comercializa la empresa.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `BIGSERIAL` | No | Clave primaria autoincremental. |
| `nombre` | `VARCHAR(100)`| No | Nombre único (ej. "Papas Fritas", "Pipocas"). |
| `descripcion` | `TEXT` | Sí | Descripción informativa. |
| `created_at` | `TIMESTAMPTZ` | No | Fecha de creación. |

---

### Tabla: `productos`
Catálogo de snacks disponibles para la preventa.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `BIGSERIAL` | No | Clave primaria autoincremental. |
| `categoria_id` | `BIGINT` | Sí | Clave foránea que referencia a `categorias.id`. |
| `nombre` | `VARCHAR(150)`| No | Nombre del snack (ej. "Papas Clásicas 50g"). |
| `descripcion` | `TEXT` | Sí | Detalle o sabor del snack. |
| `precio_unitario`| `NUMERIC(10,2)`| No | Precio de venta oficial. |
| `foto_url` | `TEXT` | Sí | Enlace a la imagen en el bucket `productos`. |
| `activo` | `BOOLEAN` | No | Si está disponible en el catálogo (`true`/`false`). |

---

### Tabla: `pedidos`
Cabecera de cada preventa realizada en una tienda.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `UUID` | No | Clave primaria autogenerada. |
| `preventista_id` | `UUID` | No | Preventista que levantó el pedido. |
| `cliente_id` | `UUID` | No | Tienda que realizó la solicitud. |
| `fecha_pedido` | `TIMESTAMPTZ` | No | Fecha y hora de la transacción. |
| `total_unidades` | `INTEGER` | No | Suma acumulada de unidades de todos los productos. |
| `total_precio` | `NUMERIC(10,2)`| No | Monto total acumulado en dinero. |
| `estado` | `VARCHAR(20)` | No | `'pendiente'`, `'confirmado'`, `'entregado'`, `'cancelado'`. |
| `observaciones` | `TEXT` | Sí | Notas del preventista (ej. "Pagar contra entrega"). |

---

### Tabla: `detalle_pedidos`
Desglose ítem por ítem de cada pedido.

| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :---: | :--- |
| `id` | `BIGSERIAL` | No | Clave primaria autoincremental. |
| `pedido_id` | `UUID` | No | Clave foránea a `pedidos.id` con eliminación en cascada. |
| `producto_id` | `BIGINT` | No | Clave foránea a `productos.id`. |
| `cantidad` | `INTEGER` | No | Número de unidades solicitadas (> 0). |
| `precio_unitario`| `NUMERIC(10,2)`| No | Precio congelado al momento del pedido. |
| `subtotal` | `NUMERIC(10,2)`| No | Resultado de `cantidad * precio_unitario`. |

---

## 3. Almacenamiento (Supabase Storage)

Se crean dos buckets con acceso público de lectura:
1. **`tiendas`**: Almacena las fotos tomadas a las fachadas de los negocios al momento del registro.
2. **`productos`**: Almacena las fotografías e ilustraciones de cada snack para mostrar en el catálogo visual.
