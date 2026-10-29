# 📐 01. Arquitectura y Flujo del Sistema

Este documento describe la arquitectura técnica del **Sistema de Gestión de Preventas de Snacks**. Su propósito es explicarte cómo se comunican las distintas partes del sistema y cómo se diseñó para operar de forma eficiente.

---

## 1. Diagrama de Arquitectura de Tres Capas

```
┌─────────────────────────────────────────────────────────────┐
│                       CAPA CLIENTE                          │
│                                                             │
│   [Preventista en Celular]       [Gerencia en Computadora]  │
│    - Registro de Clientes         - Dashboard de Ventas     │
│    - GPS + Pin en Mapa            - Mapa General            │
│    - Toma de Pedidos (+/-)        - Administración          │
│    - Almacenamiento Local                                   │
│      (IndexedDB Offline)                                    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ HTTPS (REST / JSON)          │ HTTPS (REST / JSON)
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       CAPA DE SERVICIOS                     │
│                                                             │
│                Backend en Python + FastAPI                  │
│   - Endpoints REST (/auth, /clientes, /productos, /pedidos) │
│   - Validación de Esquemas con Pydantic v2                  │
│   - Servicio de Sincronización por Lote (Sync)              │
│   - Control de Acceso por Roles (Gerente vs Preventista)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ Supabase SDK / PostgREST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       CAPA DE DATOS                         │
│                                                             │
│                    Supabase Platform                        │
│   - PostgreSQL: Tablas relacionales con RLS                 │
│   - Supabase Auth: Gestión de usuarios y contraseñas        │
│   - Supabase Storage: Buckets 'tiendas' y 'productos'       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. ¿Por qué se eligieron estas tecnologías?

### A. Frontend: Next.js (React + TypeScript)
- **Mobile-First**: Permite diseñar interfaces adaptables a teléfonos móviles con botones grandes y táctiles para preventistas en la calle.
- **Preparado para PWA**: Se puede instalar como un icono en la pantalla de inicio del celular sin necesidad de compilar un APK en la tienda de aplicaciones.
- **IndexedDB**: Permite guardar megabytes de información (productos, clientes y fotos temporales) directamente en la memoria del navegador.

### B. Backend: FastAPI (Python)
- **Velocidad y Rendimiento**: Es uno de los frameworks web de Python más rápidos del mercado (basado en Starlette y ASGI).
- **Validación Automática**: Usa Pydantic para asegurar que todo dato que llegue al servidor cumpla con los tipos correctos (ejemplo: que los precios sean positivos y las coordenadas válidas).
- **Documentación Swagger Interactiva**: Genera automáticamente una página web en `/docs` donde puedes probar todos los endpoints sin escribir código extra.
- **Preparado para App Móvil Futura**: Al estar desacoplado del frontend, en el futuro una app en React Native o Flutter puede consumir exactamente estos mismos endpoints.

### C. Base de Datos y Almacenamiento: Supabase
- **PostgreSQL**: La base de datos relacional de código abierto más sólida del mundo.
- **Storage Integrado**: Almacena de forma nativa las fotografías de las fachadas de tiendas y las fotos de snacks con URLs públicas seguras.
- **Row Level Security (RLS)**: Reglas de seguridad aplicadas directamente en la base de datos para proteger los datos de cada preventista.

---

## 3. Flujo de Trabajo del Preventista (Ciclo de Venta)

1. **Inicio de Jornada**:
   - El preventista abre la aplicación web en su celular e inicia sesión.
   - El catálogo de productos y la lista de clientes se descargan y se guardan en la memoria local (`IndexedDB`).
2. **Llegada a la Tienda**:
   - Si la tienda ya existe, la selecciona del listado o del mapa.
   - Si es un cliente nuevo, pulsa `Nuevo Cliente`, presiona `📍 Capturar GPS` y arrastra el pin en el mapa interactivo para marcar la puerta exacta del local. Toma la foto de la fachada.
3. **Toma del Pedido**:
   - Agrega bolsas de papas, pipocas o plátanos usando los botones `+` y `-`.
   - La pantalla suma automáticamente las unidades totales y calcula el importe a pagar.
4. **Confirmación**:
   - Pulsa `Confirmar Pedido`.
   - Si **hay internet**: el pedido viaja a FastAPI y se guarda en Supabase inmediatamente.
   - Si **NO hay internet**: el pedido y la foto se guardan en la cola local de `IndexedDB` y se enviarán automáticamente en cuanto se recupere la conexión.

---

## 4. Flujo de Trabajo de Gerencia

1. Inicia sesión con su usuario de rol `gerente`.
2. Accede a un panel con:
   - Total de ventas del día en dinero y unidades de snacks.
   - Listado de preventistas activos y cuántos pedidos tomó cada uno.
   - Mapa general con todos los clientes registrados para auditar rutas y cobertura de la ciudad.
   - Módulo de creación y edición de productos y precios.
