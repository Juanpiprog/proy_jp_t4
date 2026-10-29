from supabase import create_client, Client
from app.config import settings

supabase: Client = None

def get_supabase() -> Client:
    """
    Retorna el cliente de Supabase inicializado.
    """
    global supabase
    if supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL y SUPABASE_KEY deben estar configuradas en el archivo .env"
            )
        # Si existe Service Role Key la usamos para operaciones administrativas, sino la anon key
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        supabase = create_client(settings.SUPABASE_URL, key)
    return supabase
