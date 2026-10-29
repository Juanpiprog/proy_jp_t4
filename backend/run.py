# pyrefly: ignore[missing-import]
import uvicorn

if __name__ == "__main__":
    print("Iniciando servidor FastAPI en http://0.0.0.0:8000")
    print("Documentación Swagger disponible en http://localhost:8000/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
