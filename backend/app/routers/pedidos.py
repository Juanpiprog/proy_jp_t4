from fastapi import APIRouter, HTTPException
from typing import List, Optional
from uuid import UUID, uuid4
from app.database import get_supabase
from app.models.schemas import PedidoCreate, PedidoResponse

router = APIRouter(prefix="/pedidos", tags=["Pedidos (Preventas)"])

@router.get("", response_model=List[PedidoResponse])
def get_pedidos(preventista_id: Optional[UUID] = None, estado: Optional[str] = None):
    """
    Lista pedidos con su cliente y detalles de producto incluidos.
    """
    sb = get_supabase()
    try:
        query = sb.table("pedidos").select(
            "*, cliente:clientes(*), items:detalle_pedidos(*, producto:productos(*))"
        ).order("fecha_pedido", desc=True)
        
        if preventista_id:
            query = query.eq("preventista_id", str(preventista_id))
        if estado:
            query = query.eq("estado", estado)
            
        res = query.execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=PedidoResponse)
def create_pedido(payload: PedidoCreate):
    """
    Crea un pedido sumando automáticamente las cantidades y montos, e insertando sus detalles.
    """
    sb = get_supabase()
    try:
        # Calcular totales en el servidor para evitar discrepancias
        total_unidades = sum(item.cantidad for item in payload.items)
        total_precio = sum(item.subtotal for item in payload.items)
        
        pedido_id = str(payload.id) if payload.id else str(uuid4())
        
        # 1. Insertar cabecera del pedido
        pedido_data = {
            "id": pedido_id,
            "preventista_id": str(payload.preventista_id),
            "cliente_id": str(payload.cliente_id),
            "total_unidades": total_unidades,
            "total_precio": total_precio,
            "estado": "pendiente",
            "observaciones": payload.observaciones
        }
        
        res_pedido = sb.table("pedidos").insert(pedido_data).execute()
        if not res_pedido.data:
            raise HTTPException(status_code=400, detail="Error creando cabecera del pedido")

        # 2. Insertar detalles
        detalles_data = [
            {
                "pedido_id": pedido_id,
                "producto_id": item.producto_id,
                "cantidad": item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal": item.subtotal
            }
            for item in payload.items
        ]
        
        if detalles_data:
            res_detalles = sb.table("detalle_pedidos").insert(detalles_data).execute()
            if not res_detalles.data:
                raise HTTPException(status_code=400, detail="Error creando detalle de productos")

        # 3. Retornar pedido completo
        res_completo = sb.table("pedidos").select(
            "*, cliente:clientes(*), items:detalle_pedidos(*, producto:productos(*))"
        ).eq("id", pedido_id).single().execute()
        
        return res_completo.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
