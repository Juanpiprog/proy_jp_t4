from fastapi import APIRouter
from app.database import get_supabase
from app.models.schemas import SyncBatchPayload, SyncBatchResult
from uuid import uuid4

router = APIRouter(prefix="/sync", tags=["Sincronización Offline"])

@router.post("/batch", response_model=SyncBatchResult)
def sync_batch(payload: SyncBatchPayload):
    """
    Recibe un lote de clientes y pedidos creados sin conexión para persistirlos en Supabase.
    """
    sb = get_supabase()
    clientes_ok = 0
    pedidos_ok = 0
    errores = []

    # 1. Sincronizar clientes pendientes
    for cliente in payload.clientes:
        try:
            data = cliente.model_dump(exclude_unset=True)
            data["id"] = str(data.get("id") or uuid4())
            data["preventista_id"] = str(payload.preventista_id)
            
            # Upsert para no duplicar si ya se envió parcialmente
            sb.table("clientes").upsert(data).execute()
            clientes_ok += 1
        except Exception as e:
            errores.append(f"Error en cliente '{cliente.nombre_tienda}': {str(e)}")

    # 2. Sincronizar pedidos pendientes
    for pedido in payload.pedidos:
        try:
            pedido_id = str(pedido.id or uuid4())
            total_unidades = sum(i.cantidad for i in pedido.items)
            total_precio = sum(i.subtotal for i in pedido.items)
            
            pedido_data = {
                "id": pedido_id,
                "preventista_id": str(payload.preventista_id),
                "cliente_id": str(pedido.cliente_id),
                "total_unidades": total_unidades,
                "total_precio": total_precio,
                "estado": "pendiente",
                "observaciones": pedido.observaciones
            }
            sb.table("pedidos").upsert(pedido_data).execute()

            # Insertar detalles
            detalles_data = [
                {
                    "pedido_id": pedido_id,
                    "producto_id": item.producto_id,
                    "cantidad": item.cantidad,
                    "precio_unitario": item.precio_unitario,
                    "subtotal": item.subtotal
                }
                for item in pedido.items
            ]
            if detalles_data:
                sb.table("detalle_pedidos").upsert(detalles_data).execute()
                
            pedidos_ok += 1
        except Exception as e:
            errores.append(f"Error en pedido '{pedido.id}': {str(e)}")

    return SyncBatchResult(
        clientes_sincronizados=clientes_ok,
        pedidos_sincronizados=pedidos_ok,
        errores=errores
    )
