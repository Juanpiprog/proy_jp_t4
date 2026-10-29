from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, clientes, productos, pedidos, sync

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API REST para la gestión de preventas de snacks con soporte Offline-First y geolocalización.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración de CORS para permitir peticiones desde el frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se especifica el dominio exacto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de rutas modulares
app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(sync.router)

@app.get("/", tags=["Salud"])
def root():
    return {
        "status": "online",
        "proyecto": settings.PROJECT_NAME,
        "docs": "/docs",
        "version": "1.0.0"
    }
