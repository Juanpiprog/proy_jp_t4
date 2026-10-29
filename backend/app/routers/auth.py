from fastapi import APIRouter, HTTPException, status
from app.database import get_supabase
from app.models.schemas import UsuarioCreate, UsuarioLogin, UsuarioResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/register", response_model=UsuarioResponse)
def register_user(payload: UsuarioCreate):
    """
    Registra un nuevo usuario en Supabase Auth y crea su perfil con rol (gerente o preventista).
    """
    sb = get_supabase()
    try:
        # 1. Crear usuario en Supabase Auth
        auth_response = sb.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "nombre_completo": payload.nombre_completo,
                    "rol": payload.rol
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="No se pudo registrar el usuario en Supabase Auth")

        user_id = auth_response.user.id

        # 2. Insertar perfil en public.usuarios
        profile_data = {
            "id": user_id,
            "nombre_completo": payload.nombre_completo,
            "telefono": payload.telefono,
            "rol": payload.rol,
            "activo": True
        }
        res = sb.table("usuarios").insert(profile_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Error creando perfil de usuario")
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login_user(payload: UsuarioLogin):
    """
    Inicia sesión con correo y contraseña, retornando token y perfil con rol.
    """
    sb = get_supabase()
    try:
        auth_res = sb.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        
        user = auth_res.user
        session = auth_res.session
        
        # Consultar perfil en tabla public.usuarios
        profile = sb.table("usuarios").select("*").eq("id", user.id).single().execute()
        
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "user": profile.data or {
                "id": user.id,
                "email": user.email,
                "rol": "preventista"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Credenciales inválidas: {str(e)}")
