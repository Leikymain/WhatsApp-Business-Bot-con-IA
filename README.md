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

## Requisitos
- Python 3.11+ recomendado
- Node.js 18+
- pnpm (recomendado) o npm


