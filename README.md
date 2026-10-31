# 🍿 Sistema de Gestión de Preventas de Snacks (Offline-First)

Bienvenido al repositorio del **Sistema de Gestión de Preventas de Snacks**. Este proyecto fue diseñado como una solución integral que permite a preventistas en calle registrar clientes georreferenciados (con foto y ubicación GPS interactiva), tomar pedidos sumando cantidades en tiempo real —incluso **sin conexión a internet**— y a la gerencia monitorear métricas, pedidos y rutas desde un panel de control web.

---

## 🏗️ Arquitectura General

El sistema se divide en tres piezas fundamentales:

```
proy_jp_t4/
├── docs/                 # 📚 Documentación técnica y formativa del proyecto
│   ├── 01_ARQUITECTURA.md
│   ├── 02_BASE_DE_DATOS.md
│   ├── 03_GUIA_INICIO_RAPIDO.md
│   └── 04_MODO_OFFLINE_Y_MAPAS.md
├── database/             # 🗄️ Scripts SQL para Supabase
│   └── init.sql
├── backend/              #  API REST con FastAPI (Python)
│   ├── app/
│   │   ├── core/         # Configuración y conexión a Supabase
│   │   ├── models/       # Esquemas Pydantic
│   │   ├── routers/      # Rutas (auth, clientes, productos, pedidos, sync)
│   │   └── main.py       # Punto de entrada de la API
│   ├── requirements.txt
│   └── .env.example
├── frontend/             # ⚛️ Aplicación Web con Next.js (TypeScript)
│   ├── src/
│   │   ├── app/          # Rutas y páginas de Next.js
│   │   ├── components/   # Componentes UI (Mapas, Carrito, Formularios)
│   │   ├── lib/          # IndexedDB, sincronizador offline, cliente Supabase
│   │   └── types/        # Interfaces y tipos de TypeScript
│   ├── package.json
│   └── .env.local.example
└── README.md             # Este archivo
```

---

## 🚀 Tecnologías Principales

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ / React / TypeScript** | Interfaz web móvil para preventistas y panel para gerencia |
| **Estilos** | **CSS Moderno / Tailwind** | Diseño responsivo "Mobile-First" |
| **Base Local** | **IndexedDB (Dexie.js)** | Almacenamiento local para funcionamiento sin conexión |
| **Mapas** | **Leaflet + OpenStreetMap** | Captura y ajuste manual de ubicación con pin interactivo |
| **Backend** | **Python + FastAPI** | API REST rápida, modular y validada con Pydantic |
| **Base de Datos** | **Supabase (PostgreSQL)** | Almacenamiento relacional y Row Level Security |
| **Storage** | **Supabase Storage** | Almacenamiento de fotos de tiendas y catálogo de snacks |
| **Auth** | **Supabase Auth** | Autenticación con roles (`preventista` y `gerente`) |

---

## 📚 Índice de Documentación

Si estás aprendiendo a desarrollar proyectos profesionales, revisa los manuales incluidos en la carpeta [`docs/`](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/docs):

1. 📐 [**01. Arquitectura y Flujo del Sistema**](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/docs/01_ARQUITECTURA.md): Explicación de cómo interactúan frontend, backend y base de datos.
2. 🗄️ [**02. Modelo de Base de Datos y Supabase**](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/docs/02_BASE_DE_DATOS.md): Diccionario de datos, script SQL y configuración de buckets de fotos.
3. ⚡ [**03. Guía de Inicio Rápido**](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/docs/03_GUIA_INICIO_RAPIDO.md): Paso a paso para levantar el proyecto en tu máquina local.
4. 📍 [**04. Modo Offline y Mapas Interactivos**](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/docs/04_MODO_OFFLINE_Y_MAPAS.md): Cómo funciona la geolocalización por GPS y el guardado sin internet.
5. 🔌 [**05. Especificación de Endpoints de la API**](file:///c:/Users/Juan%20Pablo/Documents/usip/8%20semestre/taller%20de%20programacion%204/proy_jp_t4/docs/05_API_ENDPOINTS.md): Lista de endpoints REST con ejemplos de JSON y contratos.

