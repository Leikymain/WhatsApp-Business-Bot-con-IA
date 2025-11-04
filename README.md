# WhatsApp Business Bot con IA

Bot full‑stack para WhatsApp Business que responde automáticamente a clientes usando IA, con escalado inteligente a humanos. El backend expone una API REST con seguridad y rate limiting, y sirve el frontend de producción (Vite) desde `whatsapp-demo/dist`.

## Badges
[![Deploy: Railway](https://img.shields.io/badge/deploy-railway-blue)](<URL_REPO>) [![Stack: FastAPI](https://img.shields.io/badge/backend-fastapi-green)](<URL_REPO>) [![Stack: React+Vite](https://img.shields.io/badge/frontend-react%20%2B%20vite-orange)](<URL_REPO>)

## Tabla de Contenidos
- Arquitectura y Tecnologías
- Requisitos
- Variables de Entorno
- Instalación y Configuración
- Ejecución en Desarrollo
- Build y Servicio del Frontend
- Despliegue en Railway
- Endpoints de la API
- Seguridad y CORS
- Troubleshooting
- Estructura del Repo
- Contribución y Licencia
- Créditos

## Arquitectura y Tecnologías
- Backend
  - FastAPI, Uvicorn, Pydantic
  - Autenticación: HTTPBearer
  - CORS configurable
  - Rate limiting por IP en memoria
  - SDK oficial de Anthropic para IA
- Frontend
  - React 19 + TypeScript
  - Vite
  - Tailwind CSS
  - Lucide Icons
- Despliegue
  - Railway (Nixpacks)
  - Producción: FastAPI sirve estáticos desde `whatsapp-demo/dist`
- Dominios
  - Backend: `https://whatsapp-business-bot-con-ia-production.up.railway.app`
  - Frontend: `<FRONTEND_DOMAIN_O_IGUAL_QUE_BACKEND>`

## Requisitos
- Python 3.11+ recomendado
- Node.js 18+
- pnpm (recomendado) o npm

## Variables de Entorno
- Backend (no imprimir valores reales)
  - `ANTHROPIC_API_KEY`: clave de Anthropic
  - `API_TOKEN`: token Bearer para proteger endpoints
  - `RATE_LIMIT`: solicitudes por minuto por IP (por defecto `30`)
  - `PORT`: puerto provisto por Railway (ej. `8080`)
- Frontend (Vite, build-time; visibles en cliente)
  - `VITE_API_URL`: URL pública del backend
  - `VITE_API_TOKEN`: token que el frontend enviará en `Authorization: Bearer <token>`

Ejemplo `.env` (backend):
```env
ANTHROPIC_API_KEY=<TU_CLAVE_ANTHROPIC>
API_TOKEN=<TU_TOKEN_SECRETO>
RATE_LIMIT=30
# PORT se inyecta por Railway en producción
```

Ejemplo `.env` (frontend - si construyes local):
```env
VITE_API_URL=https://whatsapp-business-bot-con-ia-production.up.railway.app
VITE_API_TOKEN=<TU_TOKEN_SEGURO_O_IGUAL_QUE_API_TOKEN>
```

## Instalación y Configuración
Backend:
```bash
# Crear y activar entorno virtual (Windows)
python -m venv venv
venv\Scripts\activate

# Actualizar herramientas y dependencias
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

Frontend:
```bash
cd whatsapp-demo
pnpm install
```

## Ejecución en Desarrollo
Backend:
```bash
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

Frontend:
```bash
cd whatsapp-demo
pnpm run dev
```

Acceso:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8003`
- Docs: `http://localhost:8003/docs`
- Health: `http://localhost:8003/health`

## Build y Servicio del Frontend
Generar build de producción:
```bash
cd whatsapp-demo
pnpm install
pnpm build
```

Servicio en producción:
- Si existe `whatsapp-demo/dist`, FastAPI monta `StaticFiles` en `/` y sirve `index.html` como fallback para rutas SPA no‑API.
- Si no existe, el backend muestra un aviso en consola indicando que se debe construir el frontend.

## Despliegue en Railway
Variables (Service → Variables):
- Backend:
  - `ANTHROPIC_API_KEY=<TU_VALOR>`
  - `API_TOKEN=<TU_VALOR>`
  - `RATE_LIMIT=<TU_VALOR>`
- Frontend (si construyes el frontend en el mismo servicio):
  - `VITE_API_URL=https://whatsapp-business-bot-con-ia-production.up.railway.app`
  - `VITE_API_TOKEN=<TU_VALOR>`

Comandos:
- Build:
```bash
cd whatsapp-demo && pnpm install && pnpm build
```
- Start:
```bash
python main.py
```

Dominio:
- Generate Service Domain → Target port: `8080`

Verificación:
- `https://whatsapp-business-bot-con-ia-production.up.railway.app/health` debe responder `{"status":"healthy", ...}`

## Endpoints de la API
| Método | Ruta                                   | Auth      | Descripción                                   | Payload                                      | Respuesta                          |
|-------|-----------------------------------------|-----------|-----------------------------------------------|----------------------------------------------|------------------------------------|
| GET   | `/`                                     | —         | Info básica de la API                         | —                                            | JSON info                          |
| POST  | `/message/send`                         | Bearer    | Genera respuesta IA (Form)                    | `message`, `phone`, `client_id` (FormData)   | `BotResponse`                      |
| POST  | `/webhook/whatsapp`                     | —         | Webhook simulado                               | Form simulado                                | JSON                                 |
| POST  | `/client/configure`                     | Bearer    | Configura cliente con base de conocimiento    | JSON `ClientConfig`                          | JSON status                         |
| GET   | `/client/{client_id}/config`            | Bearer    | Obtiene config de cliente                      | —                                            | JSON config                         |
| GET   | `/conversation/{client_id}/{phone}`     | Bearer    | Historial de conversación                      | —                                            | JSON historial                      |
| DELETE| `/conversation/{client_id}/{phone}`     | Bearer    | Limpia historial                                | —                                            | JSON status                         |
| GET   | `/templates`                            | Bearer    | Lista plantillas de negocio                    | —                                            | JSON templates                      |
| GET   | `/health`                               | —         | Health check                                   | —                                            | JSON                                 |

Ejemplos `curl`:
```bash
# Health (público)
curl -s https://whatsapp-business-bot-con-ia-production.up.railway.app/health
```

```bash
# Templates (protegido)
curl -s -H "Authorization: Bearer <API_TOKEN>" \
  https://whatsapp-business-bot-con-ia-production.up.railway.app/templates
```

```bash
# Enviar mensaje (protegido, FormData)
curl -s -X POST \
  -H "Authorization: Bearer <API_TOKEN>" \
  -F "message=Hola, ¿tenéis menú del día?" \
  -F "phone=+34600123456" \
  -F "client_id=restaurante" \
  https://whatsapp-business-bot-con-ia-production.up.railway.app/message/send
```

## Seguridad y CORS
- Autenticación Bearer con `HTTPBearer(auto_error=False)` y dependencia `verify_token`.
- Rate limiting por IP en memoria (60s). Recomendado Redis en producción real.
- CORS: permisivo para pruebas (`allow_origins=["*"]`). En producción, restringir a `<FRONTEND_DOMAIN_O_IGUAL_QUE_BACKEND>`.
- Frontend (Vite): `VITE_*` se embebe en el build y es visible en cliente.
  - Riesgo: exponer `Bearer` en navegador. Alternativas:
    - Quitar auth en `/message/send` y proteger solo rutas administrativas.
    - Backend intermedio con sesión y firma de peticiones.
    - Rate limiting, auditoría y validación adicional.

## Troubleshooting
- `net::ERR_CONNECTION_REFUSED`:
  - Servicio no escuchando o dominio incorrecto. Verifica `PORT` (8080) y `Generate Domain`.
- `401 Unauthorized`:
  - Falta o no coincide `Authorization: Bearer`. Revisa `API_TOKEN` en backend y `VITE_API_TOKEN` en build del frontend.
- `500 "API key no configurada"`:
  - Falta `ANTHROPIC_API_KEY` en Railway.
- CORS:
  - Bloqueos de navegador. Ajusta `allow_origins` a tu dominio del frontend.
- Tailwind/PostCSS/Vite:
  - Warnings de `@tailwind`/`@apply` por linter. Usa la extensión de Tailwind en VS Code.
  - `Cannot find module 'tailwindcss'`: ejecuta `pnpm install` y asegura `postcss.config.js` y `tailwind.config.js`.
- Instalación Python:
  - Si fallan wheels nativos (ej. `uvicorn[standard]`, `tokenizers`), usa `uvicorn` sin extras y actualiza `pip/setuptools/wheel`.

## Estructura del Repo
