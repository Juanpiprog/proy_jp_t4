# 📍 04. Modo Offline y Mapas Interactivos

Este documento explica cómo funciona el corazón de la aplicación: la **geolocalización interactiva** y la **arquitectura Offline-First** que permite a los preventistas trabajar sin internet.

---

## 1. ¿Cómo funciona la Geolocalización y el Mapa?

El registro de clientes requiere una ubicación precisa para que luego el camión repartidor o el gerente puedan encontrar la tienda en el mapa.

### A. Obtención automática por GPS Satelital
- El navegador web expone la API estándar `navigator.geolocation.getCurrentPosition()`.
- Cuando el preventista pulsa el botón **`📍 Obtener mi ubicación actual`**, el teléfono consulta directamente los satélites GPS.
- **Ventaja clave**: El GPS del celular es un chip de hardware independiente. **Funciona incluso en modo avión o sin señal de datos celulares**.

### B. Ajuste fino interactivo (Pin arrastrable con Mouse o Dedo)
- A veces el preventista está en la esquina opuesta o dentro del local donde el GPS tiene un pequeño margen de error.
- En la interfaz web integramos **Leaflet** con un marcador que tiene la propiedad `draggable: true`:
  - **En computadora**: Puedes hacer clic sostenido en el pin y moverlo con el mouse.
  - **En celular**: Puedes tocar el pin y deslizarlo con el dedo hasta la puerta exacta del local.
  - **Clic en mapa**: Si haces clic o tap en cualquier lugar de la calle, el marcador salta de inmediato a esa posición.
- Cada movimiento actualiza automáticamente los campos numéricos de **Latitud** y **Longitud**.

---

## 2. ¿Cómo funciona el Modo Offline-First (Sin Conexión)?

Un preventista pasa gran parte del día en zonas con mala cobertura. Si la app requiriese internet todo el tiempo, el preventista no podría trabajar.

```
                    ┌─────────────────────────┐
                    │      PREVENTISTA        │
                    │  Crea cliente / pedido  │
                    └────────────┬────────────┘
                                 │
                   ¿Hay conexión a Internet?
                                 │
                 ┌───────────────┴───────────────┐
             SÍ  ▼                               ▼  NO
   ┌────────────────────┐             ┌─────────────────────┐
   │ Envío directo a    │             │ Guardado en         │
   │ FastAPI y Supabase │             │ IndexedDB local     │
   │                    │             │ (Estado: 'pending') │
   └────────────────────┘             └──────────┬──────────┘
                                                 │
                                     El teléfono recupera
                                     señal o WiFi
                                                 │
                                                 ▼
                                      ┌─────────────────────┐
                                      │ Sincronización      │
                                      │ Automática en lote  │
                                      │ 1. Sube fotos       │
                                      │ 2. Envía clientes   │
                                      │ 3. Envía pedidos    │
                                      └─────────────────────┘
```

### A. IndexedDB (Base de datos local del navegador)
- A diferencia de `localStorage` (que solo guarda 5MB de texto plano), **`IndexedDB`** es una base de datos NoSQL completa dentro del navegador que puede almacenar cientos de megabytes.
- Permite almacenar objetos binarios (`Blob` / fotos tomadas con la cámara) y listas completas de productos y pedidos pendientes.
- En este proyecto utilizamos la librería **`Dexie.js`**, que simplifica las consultas y transacciones sobre IndexedDB.

### B. Estructura de la base local en el celular (`preventa_db`):
- `catalog_products`: Copia en caché de todos los snacks para armar pedidos sin internet.
- `pending_clients`: Clientes creados en la calle pendientes de sincronizar (incluye foto temporal y coordenadas).
- `pending_orders`: Pedidos creados en la calle pendientes de sincronizar.

### C. Proceso de Sincronización Automática:
1. La aplicación escucha los eventos del navegador:
   ```typescript
   window.addEventListener('online', () => {
       ejecutarSincronizacion();
   });
   ```
2. Además, en la cabecera de la app se muestra un indicador visual:
   - 🟢 **En línea**: Conectado a la nube.
   - 🟠 **Sin conexión (X pendientes)**: Trabajando en local.
   - Botón manual **`🔄 Sincronizar Ahora`** por si el preventista desea forzar la subida de datos.
3. Al sincronizar:
   - Toma cada foto pendiente guardada localmente y la sube al bucket `tiendas` de Supabase Storage.
   - Envía el cliente creado con la URL pública generada.
   - Envía el pedido con sus detalles al backend FastAPI.
   - Marca los elementos locales como sincronizados o los limpia de la cola.
