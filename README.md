# WhatsApp Business Bot con IA

Bot inteligente para WhatsApp Business que responde automáticamente a clientes usando IA, con escalado inteligente a humanos cuando es necesario.

## 🏗️ Arquitectura del Proyecto

Este proyecto está compuesto por dos partes principales:

### 🔧 Backend (FastAPI)
- **API REST** con FastAPI
- **Autenticación** por Bearer token
- **Rate limiting** por IP
- **IA conversacional** con escalado inteligente
- **CORS** configurado para desarrollo

### 🎨 Frontend (React + TypeScript + Vite)
- **Interfaz moderna** tipo WhatsApp
- **React 19** con TypeScript
- **Tailwind CSS** para estilos
- **Lucide React** para iconos
- **Diseño responsive** y animaciones

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Python 3.8+**
- **Node.js 18+**
- **pnpm** (recomendado) o npm

### 1. Configuración del Backend

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores
```

### 2. Configuración del Frontend

```bash
# Navegar al directorio del frontend
cd whatsapp-demo

# Instalar dependencias
pnpm install

# Configurar variables de entorno (opcional)
cp .env.example .env.local
```

## 🔐 Seguridad y Rate Limiting

### Características de Seguridad

- **Autenticación** por Bearer token con `HTTPBearer(auto_error=False)` y dependencia `verify_token`
- **Rate limiting** por IP en memoria (ventana deslizante de 60s) usando variables de entorno
- **CORS** configurado con `allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]`
- El endpoint `/health` es **público** (sin auth ni rate limiting)

### Variables de Entorno

- `API_TOKEN`: Token esperado para el esquema `Authorization: Bearer <token>`
- `RATE_LIMIT`: Límite de solicitudes por minuto por IP (por defecto `30`)

Ejemplo `.env`:

```env
API_TOKEN=tu_token_secreto_muy_seguro
RATE_LIMIT=30
```

### ⚠️ Advertencia de Producción

El rate limit en memoria no es seguro para entornos multi-proceso/cluster ni múltiples réplicas. Para producción, usa una solución distribuida como Redis (por ejemplo, contadores con expiración o token bucket en Redis).

## 🏃‍♂️ Ejecución

### Desarrollo

#### Backend (Terminal 1)
```bash
# Activar entorno virtual
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Ejecutar servidor de desarrollo
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

#### Frontend (Terminal 2)
```bash
# Navegar al frontend
cd whatsapp-demo

# Ejecutar servidor de desarrollo
pnpm run dev
```

### Producción

#### Backend
```bash
uvicorn main:app --host 0.0.0.0 --port 8003
```

#### Frontend
```bash
cd whatsapp-demo
pnpm run build
pnpm run preview
```

## 🌐 URLs de Acceso

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8003
- **Documentación API**: http://localhost:8003/docs
- **Health Check**: http://localhost:8003/health

## Pruebas de humo/manuales

Suponiendo `API_TOKEN=secreto` y `RATE_LIMIT=3` para facilitar la prueba:

1. 401 sin token:

   - Haz una petición `GET /templates` sin header `Authorization`.
   - Respuesta esperada: `401` con `{"detail":"Falta el header Authorization: Bearer <token>"}`.

2. 401 con token incorrecto:

   - Haz la misma petición con `Authorization: Bearer invalido`.
   - Respuesta esperada: `401` con `{"detail":"Token inválido o no autorizado"}`.

3. 200 con token correcto:

   - Haz la petición con `Authorization: Bearer secreto` dentro del límite.
   - Respuesta esperada: `200`.

4. 429 al exceder el límite:

   - Repite la petición protegida desde la misma IP más de `RATE_LIMIT` veces dentro de 60s.
   - Respuesta esperada: `429` con `{"detail":"Demasiadas peticiones. Espera un minuto antes de volver a intentar."}`.

5. `/health` público:
   - `GET /health` sin headers especiales.
   - Respuesta esperada: `200`.
