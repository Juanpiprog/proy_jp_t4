from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ==========================================
# USUARIOS & AUTENTICACIÓN
# ==========================================
class UsuarioBase(BaseModel):
    nombre_completo: str
    telefono: Optional[str] = None
    rol: str = Field(..., pattern="^(gerente|preventista)$")

class UsuarioCreate(UsuarioBase):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class UsuarioResponse(UsuarioBase):
    id: UUID
    activo: bool
    created_at: Optional[datetime] = None

# ==========================================
# CLIENTES (Puntos de venta)
# ==========================================
class ClienteBase(BaseModel):
    nombre_tienda: str
    nombre_propietario: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    foto_tienda_url: Optional[str] = None

class ClienteCreate(ClienteBase):
    id: Optional[UUID] = None # Puede venir generado localmente desde IndexedDB
    preventista_id: UUID

class ClienteResponse(ClienteBase):
    id: UUID
    preventista_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

# ==========================================
# CATEGORÍAS & PRODUCTOS
# ==========================================
class CategoriaResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None

class ProductoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio_unitario: float = Field(..., ge=0)
    foto_url: Optional[str] = None
    activo: bool = True
    categoria_id: Optional[int] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    id: int
    categoria: Optional[CategoriaResponse] = None
    created_at: Optional[datetime] = None

# ==========================================
# PEDIDOS Y DETALLE
# ==========================================
class DetallePedidoItem(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)
    precio_unitario: float = Field(..., ge=0)
    subtotal: float = Field(..., ge=0)

class DetallePedidoResponse(DetallePedidoItem):
    id: int
    producto: Optional[ProductoResponse] = None

class PedidoCreate(BaseModel):
    id: Optional[UUID] = None # UUID generado en cliente para soporte offline
    preventista_id: UUID
    cliente_id: UUID
    observaciones: Optional[str] = None
    items: List[DetallePedidoItem]

class PedidoResponse(BaseModel):
    id: UUID
    preventista_id: UUID
    cliente_id: UUID
    fecha_pedido: Optional[datetime] = None
    total_unidades: int
    total_precio: float
    estado: str
    observaciones: Optional[str] = None
    cliente: Optional[ClienteResponse] = None
    items: Optional[List[DetallePedidoResponse]] = None

# ==========================================
# SINCRONIZACIÓN OFFLINE POR LOTES
# ==========================================
class SyncBatchPayload(BaseModel):
    preventista_id: UUID
    clientes: List[ClienteCreate] = []
    pedidos: List[PedidoCreate] = []

class SyncBatchResult(BaseModel):
    clientes_sincronizados: int
    pedidos_sincronizados: int
    errores: List[str] = []
