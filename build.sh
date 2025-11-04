#!/bin/bash
set -e

echo "🚀 Iniciando build automático del frontend (Vite + React con pnpm)..."

# Construir el frontend
cd whatsapp-demo
pnpm install --frozen-lockfile
pnpm run build
cd ..

echo "✅ Frontend construido correctamente en whatsapp-demo/dist"

# Instalar dependencias del backend
pip install -r requirements.txt

# Iniciar el servidor de FastAPI
echo "🚀 Iniciando servidor FastAPI..."
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
