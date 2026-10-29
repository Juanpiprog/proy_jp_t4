from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from typing import List, Optional
from uuid import UUID, uuid4
from app.database import get_supabase
from app.models.schemas import ClienteCreate, ClienteResponse

router = APIRouter(prefix="/clientes", tags=["Clientes (Tiendas)"])

@router.get("", response_model=List[ClienteResponse])
def get_clientes(preventista_id: Optional[UUID] = None):
    """
    Lista todos los clientes o los pertenecientes a un preventista específico.
    """
    sb = get_supabase()
    try:
        query = sb.table("clientes").select("*").order("created_at", desc=True)
        if preventista_id:
            query = query.eq("preventista_id", str(preventista_id))
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"--- ERROR EN GET /clientes ---: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ClienteResponse)
def create_cliente(payload: ClienteCreate):
    """
    Crea un nuevo cliente o tienda georreferenciada.
    """
    sb = get_supabase()
    try:
        data = payload.model_dump(exclude_unset=True)
        if "id" in data and data["id"] is not None:
            data["id"] = str(data["id"])
        else:
            data["id"] = str(uuid4())
            
        data["preventista_id"] = str(data["preventista_id"])
        
        res = sb.table("clientes").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="No se pudo insertar el cliente")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subir-foto")
async def upload_foto_tienda(file: UploadFile = File(...)):
    """
    Sube la foto de la fachada al bucket 'tiendas' en Supabase Storage y retorna la URL pública.
    """
    sb = get_supabase()
    try:
        contents = await file.read()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        file_name = f"{uuid4()}.{file_ext}"
        
        # Subir a storage
        sb.storage.from_("tiendas").upload(
            file_name,
            contents,
            {"content-type": file.content_type or "image/jpeg"}
        )
        
        # Obtener URL pública
        public_url = sb.storage.from_("tiendas").get_public_url(file_name)
        return {"url": public_url, "file_name": file_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")
