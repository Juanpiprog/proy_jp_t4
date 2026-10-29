# 🔌 05. Especificación de Endpoints de la API

La API del backend está construida con **FastAPI** y expone endpoints REST estructurados. Puedes probarlos directamente abriendo `http://localhost:8000/docs` en tu navegador cuando el servidor esté corriendo.

---

## 1. Autenticación (`/auth`)

### `POST /auth/register`
Registra un nuevo empleado (preventista o gerente) tanto en Supabase Auth como en la tabla `public.usuarios`.

**Cuerpo de la petición (JSON):**
```json
{
  "email": "preventista1@snacks.com",
  "password": "Password123!",
  "nombre_completo": "Carlos Mendoza",
  "telefono": "70012345",
  "rol": "preventista"
}
```

### `POST /auth/login`
Inicia sesión y entrega el token de acceso JWT y el rol del usuario.

**Cuerpo de la petición (JSON):**
```json
{
  "email": "preventista1@snacks.com",
  "password": "Password123!"
}
```

---

## 2. Clientes / Tiendas (`/clientes`)

### `GET /clientes`
Obtiene la lista de tiendas registradas. Opcionalmente acepta `?preventista_id=UUID`.

### `POST /clientes`
Registra una nueva tienda con coordenadas GPS y foto de fachada.

**Cuerpo de la petición (JSON):**
```json
{
  "preventista_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "nombre_tienda": "Abarrotes Don Pepe",
  "nombre_propietario": "José Perez",
  "telefono": "78945612",
  "direccion": "Av. Heroínas #450, esquina San Martín",
  "latitud": -17.393520,
  "longitud": -66.157010,
  "foto_tienda_url": "https://.../tiendas/foto123.jpg"
}
```

### `POST /clientes/subir-foto`
Envío de archivo binario `multipart/form-data` con la imagen capturada. Sube la foto al bucket `tiendas` de Supabase Storage y retorna la URL pública.

---

## 3. Catálogo de Snacks (`/productos`)

### `GET /productos`
Lista todos los snacks disponibles con su categoría asociada. Filtro opcional `?categoria_id=1`.

### `GET /productos/categorias`
Lista todas las categorías (Papas Fritas, Pipocas, Platanitos, etc.).

---

## 4. Pedidos y Preventa (`/pedidos`)

### `GET /pedidos`
Lista todos los pedidos registrados con la información del cliente y la lista de snacks pedidos. Acepta filtros `?preventista_id=UUID` y `?estado=pendiente`.

### `POST /pedidos`
Registra un pedido sumando automáticamente las cantidades y subtotales en el servidor.

**Cuerpo de la petición (JSON):**
```json
{
  "preventista_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "cliente_id": "e45a9071-3a05-4f3b-85d7-ecfca8f44d8b",
  "observaciones": "Dejar el pedido antes del mediodía",
  "items": [
    {
      "producto_id": 1,
      "cantidad": 10,
      "precio_unitario": 5.00,
      "subtotal": 50.00
    },
    {
      "producto_id": 3,
      "cantidad": 5,
      "precio_unitario": 3.50,
      "subtotal": 17.50
    }
  ]
}
```

---

## 5. Sincronización Offline en Lote (`/sync`)

### `POST /sync/batch`
Endpoint especial consumido por el frontend en cuanto se recupera la conexión a internet. Recibe un lote completo de tiendas y pedidos creados sin conexión y los inserta de manera atómica o idempotente.

**Cuerpo de la petición (JSON):**
```json
{
  "preventista_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "clientes": [ ... ],
  "pedidos": [ ... ]
}
```
