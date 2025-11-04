#!/bin/bash
set -e
echo "🚀 Building frontend..."
cd whatsapp-demo
npm install
npm run build
cd ..
echo "✅ Frontend built successfully."
pip install -r requirements.txt
python main.py
