-- ========================================================
-- SISTEMA DE PREVENTA DE SNACKS - SCRIPT INICIAL SUPABASE
-- ========================================================

-- 1. TABLA DE PERFILES / USUARIOS (Ligada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('gerente', 'preventista')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar seguridad de nivel de fila (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a autenticados" ON public.usuarios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualizar propio perfil" ON public.usuarios
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. TABLA DE CLIENTES (Tiendas georreferenciadas con foto)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preventista_id UUID,
    nombre_tienda VARCHAR(150) NOT NULL,
    nombre_propietario VARCHAR(150),
    telefono VARCHAR(20),
    direccion TEXT,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    foto_tienda_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes lectura general" ON public.clientes
    FOR SELECT USING (true);

CREATE POLICY "Clientes insercion general" ON public.clientes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Clientes actualizacion general" ON public.clientes
    FOR UPDATE USING (true);

-- 3. TABLA DE CATEGORÍAS DE SNACKS
CREATE TABLE IF NOT EXISTS public.categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorías visibles para todos" ON public.categorias
    FOR SELECT USING (true);

-- 4. TABLA DE PRODUCTOS (Catálogo)
CREATE TABLE IF NOT EXISTS public.productos (
    id BIGSERIAL PRIMARY KEY,
    categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    foto_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Productos visibles para todos" ON public.productos
    FOR SELECT USING (true);

-- 5. TABLA DE PEDIDOS (Cabecera)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preventista_id UUID,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    fecha_pedido TIMESTAMPTZ DEFAULT NOW(),
    total_unidades INTEGER NOT NULL DEFAULT 0,
    total_precio NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'entregado', 'cancelado')),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pedidos lectura general" ON public.pedidos
    FOR SELECT USING (true);

CREATE POLICY "Pedidos insercion general" ON public.pedidos
    FOR INSERT WITH CHECK (true);

-- 6. TABLA DE DETALLE DE PEDIDOS (Líneas de producto)
CREATE TABLE IF NOT EXISTS public.detalle_pedidos (
    id BIGSERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES public.productos(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

ALTER TABLE public.detalle_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Detalle lectura general" ON public.detalle_pedidos
    FOR SELECT USING (true);

CREATE POLICY "Detalle insercion general" ON public.detalle_pedidos
    FOR INSERT WITH CHECK (true);

-- 7. BUCKETS DE STORAGE (Tiendas y Productos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tiendas', 'tiendas', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso a storage
CREATE POLICY "Permitir subida publica de fotos de tiendas"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'tiendas');

CREATE POLICY "Permitir actualizacion publica de fotos de tiendas"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'tiendas');

CREATE POLICY "Permitir lectura publica de fotos de tiendas"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'tiendas');

CREATE POLICY "Permitir lectura publica de fotos de productos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'productos');

-- 8. DATOS SEMILLA (Categorías y snacks de muestra)
INSERT INTO public.categorias (nombre, descripcion) VALUES
('Papas Fritas', 'Papas tradicionales, onduladas y con sabores'),
('Pipocas', 'Pipocas dulces, saladas y acarameladas'),
('Platanitos', 'Plátano salado y dulce maduro'),
('Extruidos / Chizitos', 'Snacks de maíz horneados y queso')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.productos (categoria_id, nombre, precio_unitario) VALUES
(1, 'Papas Clásicas 50g', 5.00),
(1, 'Papas Onduladas Picantes 50g', 5.50),
(2, 'Pipocas Dulces 70g', 3.50),
(2, 'Pipocas Mantequilla 70g', 4.00),
(3, 'Platanitos Salados 60g', 4.50),
(4, 'Chizitos de Queso 45g', 3.00)
ON CONFLICT DO NOTHING;
