# ⚡ 03. Guía de Inicio Rápido

Sigue estos sencillos pasos para poner en marcha el proyecto en tu computadora local.

---

## 1. Requisitos Previos

Asegúrate de tener instalados:
- **Python 3.11+** (comprueba en consola con `py --version` o `python --version`).
- **Node.js v18+ y npm** (comprueba con `node --version` y `npm --version`).
- Una cuenta gratuita en [Supabase.com](https://supabase.com).

---

## 2. Paso 1: Configurar la Base de Datos en Supabase

1. Inicia sesión en **Supabase** y crea un nuevo proyecto llamado `preventas-snacks`.
2. Dirígete a la sección **SQL Editor** en el menú lateral izquierdo.
3. Haz clic en **New query** (Nueva consulta).
4. Abre el archivo [`database/init.sql`](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/database/init.sql), copia todo su contenido, pégalo en el editor de Supabase y pulsa **Run**.
5. ¡Listo! Todas las tablas, relaciones, datos de snacks de prueba y los buckets de almacenamiento (`tiendas` y `productos`) habrán sido creados.

---

## 3. Paso 2: Configurar y Levantar el Backend (FastAPI)

1. Abre una terminal en la carpeta `/backend`:
   ```bash
   cd backend
   ```
2. Crea un entorno virtual de Python:
   ```bash
   py -m venv venv
   ```
3. Activa el entorno virtual:
   - **En Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **En Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
4. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
5. Crea un archivo `.env` en la carpeta `backend/` basado en `.env.example`:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-anon-key-de-supabase
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-opcional
   ```
   *(Estos datos los obtienes en Supabase -> Project Settings -> API)*.
6. Inicia el servidor de FastAPI:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
7. Abre en tu navegador:
   - API corriendo: `http://localhost:8000`
   - Documentación interactiva Swagger: `http://localhost:8000/docs`

---

## 4. Paso 3: Configurar y Levantar el Frontend (Next.js)

1. Abre una segunda terminal en la carpeta `/frontend`:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env.local` en la carpeta `frontend/` basado en `.env.local.example`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```
4. Inicia el servidor de desarrollo de Next.js:
   ```bash
   npm run dev
   ```
5. Abre en tu navegador:
   - Aplicación Web: `http://localhost:3000`

---

## 5. Probar el Modo Offline

Para probar el funcionamiento sin internet desde tu navegador en la computadora:
1. Abre las herramientas de desarrollador en Chrome o Edge (`F12` o `Ctrl + Shift + I`).
2. Ve a la pestaña **Network** (Red).
3. En el selector de velocidad (que por defecto dice *No throttling*), cámbialo a **Offline**.
4. ¡Prueba a registrar un cliente y tomar un pedido! Verás cómo se guarda localmente en IndexedDB.
5. Vuelve a cambiar el selector a *No throttling* (Con conexión) y observa cómo se sincronizan automáticamente los datos con Supabase.
