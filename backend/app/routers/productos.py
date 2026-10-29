from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.database import get_supabase
from app.models.schemas import ProductoResponse, ProductoCreate, CategoriaResponse

router = APIRouter(prefix="/productos", tags=["Catálogo de Snacks"])

@router.get("", response_model=List[ProductoResponse])
def get_productos(categoria_id: Optional[int] = None, solo_activos: bool = True):
    """
    Lista el catálogo de snacks con su categoría asociada.
    """
    sb = get_supabase()
    try:
        query = sb.table("productos").select("*, categoria:categorias(*)").order("id")
        if solo_activos:
            query = query.eq("activo", True)
        if categoria_id:
            query = query.eq("categoria_id", categoria_id)
            
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"--- ERROR EN GET /productos ---: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categorias", response_model=List[CategoriaResponse])
def get_categorias():
    """
    Lista todas las categorías de snacks disponibles.
    """
    sb = get_supabase()
    try:
        res = sb.table("categorias").select("*").order("id").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ProductoResponse)
def create_producto(payload: ProductoCreate):
    """
    Crea un nuevo producto en el catálogo (usado por Gerencia).
    """
    sb = get_supabase()
    try:
        res = sb.table("productos").insert(payload.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Error creando producto")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
