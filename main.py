import logging
import os
from copy import deepcopy
from datetime import datetime
from time import time
from typing import Optional, List, Dict

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Form, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth_middleware import require_auth

load_dotenv()

app = FastAPI(
    title="WhatsApp AI Bot API",
    description="Bot de WhatsApp Business con IA - By Jorge Lago",
    version="1.0.0"
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")

app.add_middleware(CORSMiddleware, allow_origins=allowed_origins_env,allow_credentials=True,
    allow_methods=["*"],        # Permite GET, POST, OPTIONS, etc.
    allow_headers=["*"], )

logger = logging.getLogger("whatsapp_bot_api")

# =============================
# Seguridad: Rate Limit
# =============================

# Rate limiting por IP (en memoria)
RATE_LIMIT = int(os.getenv("RATE_LIMIT", 30))  # solicitudes por minuto
RATE_WINDOW = 60  # segundos
request_timestamps: dict[str, list[float]] = {}

def check_rate_limit(client_ip: str):
    """Chequea y aplica rate limit por IP en ventana deslizante de 60s.

    Nota: Este rate limit en memoria no es seguro para multi-proceso/cluster.
    Para producción se recomienda usar Redis (por ejemplo, un contador por IP
    con expiración en Redis o un bucket de tokens distribuido).
    """
    now = time()
    timestamps = request_timestamps.get(client_ip, [])

    # Filtrar timestamps fuera de ventana
    valid_since = now - RATE_WINDOW
    timestamps = [ts for ts in timestamps if ts >= valid_since]

    if len(timestamps) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas peticiones. Espera un minuto antes de volver a intentar."
        )

    # Registrar timestamp actual y guardar
    timestamps.append(now)
    request_timestamps[client_ip] = timestamps

# Modelos de datos
class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ConversationHistory(BaseModel):
    phone: str
    messages: List[Message]
    client_id: str

class BotResponse(BaseModel):
    response: str
    should_escalate: bool
    escalation_reason: Optional[str]
    conversation_id: str
    timestamp: str

class ClientConfig(BaseModel):
    client_id: str
    business_name: str
    business_type: str
    knowledge_base: str
    auto_responses: Dict[str, str]
    escalation_keywords: List[str]
    business_hours: Dict[str, str]

# Base de conocimiento por tipo de negocio (ejemplos)
BUSINESS_TEMPLATES = {
    "restaurante": {
        "business_type": "Restaurante",
        "knowledge_base": """
INFORMACIÓN DEL NEGOCIO:
- Horario: Lunes a Domingo 13:00-16:00 y 20:00-23:00
- Especialidad: Cocina mediterránea
- Precio medio: 25-35€ por persona
- Aceptamos reservas: Sí, llamar al teléfono o por WhatsApp
- Menú del día: Sí, 15€ (L-V mediodía)
- Terraza: Disponible
- Parking: Parking público a 100m

PREGUNTAS FRECUENTES:
- ¿Tenéis menú vegano? Sí, varios platos veganos disponibles
- ¿Se puede pagar con tarjeta? Sí, aceptamos todas las tarjetas
- ¿Hacéis para llevar? Sí, pedidos por teléfono o WhatsApp
""",
        "auto_responses": {
            "hola": "¡Hola! 👋 Bienvenido a [Nombre Restaurante]. ¿En qué puedo ayudarte?",
            "horario": "Abrimos de Lunes a Domingo: 13:00-16:00 y 20:00-23:00",
            "precio": "Nuestro precio medio es de 25-35€ por persona. Tenemos menú del día a 15€ (L-V mediodía).",
            "reserva": "Para reservar, por favor indícame: fecha, hora y número de personas. O llama al [TELÉFONO]"
        },
        "escalation_keywords": ["queja", "problema", "gerente", "reclamación", "mal servicio"]
    },
    "tienda": {
        "business_type": "Tienda/Ecommerce",
        "knowledge_base": """
INFORMACIÓN DEL NEGOCIO:
- Horario: L-V 10:00-14:00 y 17:00-20:00, Sábados 10:00-14:00
- Productos: [Especificar categoría]
- Envíos: Toda España, 24-48h
- Envío gratis: Pedidos >50€
- Devoluciones: 30 días
- Formas de pago: Tarjeta, PayPal, Bizum, transferencia

PREGUNTAS FRECUENTES:
- ¿Cuánto tarda el envío? 24-48h laborables
- ¿Puedo devolver? Sí, 30 días sin preguntas
- ¿Tenéis tienda física? Sí, en [DIRECCIÓN]
""",
        "auto_responses": {
            "hola": "¡Hola! 👋 Bienvenido a [Nombre Tienda]. ¿Buscas algo en concreto?",
            "envío": "Envíos en 24-48h a toda España. Gratis en pedidos superiores a 50€.",
            "horario": "L-V 10:00-14:00 y 17:00-20:00, Sábados 10:00-14:00",
            "precio": "¿Qué producto te interesa? Te paso el precio al momento."
        },
        "escalation_keywords": ["pedido perdido", "no ha llegado", "defectuoso", "roto", "reclamación"]
    },
    "inmobiliaria": {
        "business_type": "Agencia Inmobiliaria",
        "knowledge_base": """
INFORMACIÓN DEL NEGOCIO:
- Servicios: Compra, venta, alquiler de propiedades
- Zona de actuación: [CIUDAD/ZONA]
- Horario oficina: L-V 9:00-14:00 y 16:00-19:00
- Comisiones: Transparentes, consultar
- Visitas: Con cita previa

PROCESO:
1. Cliente indica qué busca (compra/alquiler, zona, presupuesto)
2. Le enviamos propiedades disponibles
3. Coordinamos visita
4. Asesoramiento durante todo el proceso

PREGUNTAS FRECUENTES:
- ¿Cobráis por enseñar pisos? No, las visitas son gratuitas
- ¿Cuánto son las comisiones? Depende del servicio, te informamos sin compromiso
""",
        "auto_responses": {
            "hola": "¡Hola! 👋 Soy el asistente de [Inmobiliaria]. ¿Buscas comprar, alquilar o vender?",
            "horario": "Nuestra oficina abre L-V de 9:00-14:00 y 16:00-19:00",
            "visita": "Para coordinar una visita, indícame: ¿qué propiedad te interesa y tu disponibilidad horaria?"
        },
        "escalation_keywords": ["urgente", "contrato", "problemas", "abogado", "legal"]
    }
}

# Storage simple en memoria (en producción usarías Redis/DB)
conversations_store: Dict[str, List[Dict]] = {}
clients_config: Dict[str, Dict] = {}

def get_or_create_conversation(phone: str, client_id: str) -> List[Dict]:
    """Recupera o crea historial de conversación"""
    key = f"{client_id}_{phone}"
    if key not in conversations_store:
        conversations_store[key] = []
    return conversations_store[key]

def should_escalate(message: str, client_config: Dict) -> tuple[bool, Optional[str]]:
    """Determina si el mensaje requiere atención humana"""
    message_lower = message.lower()
    
    # Verificar keywords de escalación
    for keyword in client_config.get("escalation_keywords", []):
        if keyword in message_lower:
            return True, f"Keyword detectado: '{keyword}'"
    
    # Detectar frustración/enfado
    frustration_words = ["terrible", "horrible", "pésimo", "nunca más", "estafa", "vergüenza"]
    if any(word in message_lower for word in frustration_words):
        return True, "Cliente parece frustrado"
    
    return False, None

def get_ai_response(message: str, conversation_history: List[Dict], client_config: Dict) -> str:
    """Genera respuesta con IA"""
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY no configurada")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
    
    client = anthropic.Anthropic(api_key=api_key)
    
    # System prompt personalizado por negocio
    system_prompt = f"""Eres un asistente virtual de WhatsApp para {client_config.get('business_name', 'un negocio')}.

{client_config.get('knowledge_base', '')}

INSTRUCCIONES:
- Responde de forma amigable, natural y concisa (máximo 2-3 mensajes cortos)
- Usa emojis ocasionalmente para ser cercano 😊
- Si no sabes algo, di "Déjame consultarlo con el equipo y te respondo enseguida"
- Siempre sé cortés y profesional
- Si detectas que el cliente necesita atención urgente o personalizada, indícalo claramente

Estilo: WhatsApp (informal pero profesional, mensajes cortos)
"""
    
    # Preparar mensajes
    messages = []
    for msg in conversation_history[-5:]:  # Últimos 5 mensajes para contexto
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    messages.append({"role": "user", "content": message})
    
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            temperature=0.7,
            system=system_prompt,
            messages=messages
        )
        
        return response.content[0].text
        
    except Exception:
        logger.exception("Error generando respuesta de IA")
        return "Disculpa, estoy teniendo problemas técnicos. Un miembro del equipo te responderá enseguida."


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Error no controlado procesando %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor"},
    )

@app.get("/")
def root():
    return {
        "message": "WhatsApp AI Bot API - Activa",
        "docs": "/docs",
        "version": "1.0.0",
        "developer": "Jorge Lago Campos",
        "business_templates": list(BUSINESS_TEMPLATES.keys())
    }

@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request, _token: str = Depends(require_auth)):
    """
    Webhook para recibir mensajes de Twilio/WhatsApp Business API.
    En producción, aquí recibirías los mensajes directamente de WhatsApp.
    """
    data = await request.form()
    
    incoming_message = data.get("Body", "")
    sender_phone = data.get("From", "").replace("whatsapp:", "")
    client_id = data.get("To", "demo").replace("whatsapp:", "")
    
    # Procesar mensaje
    response_data = await process_message(
        message=incoming_message,
        phone=sender_phone,
        client_id=client_id
    )
    
    # En producción, aquí enviarías la respuesta de vuelta por Twilio
    return {"status": "success", "response": response_data}

@app.post("/message/send", response_model=BotResponse)
async def process_message(
    message: str = Form(...),
    phone: str = Form(...),
    client_id: str = Form(default="demo"),
    req: Request = None,
    _token: str = Depends(require_auth)
):
    """
    Endpoint para testing/demo sin Twilio.
    Simula recibir un mensaje y genera respuesta con IA.
    """
    # Rate limiting por IP (aplica solo a endpoints protegidos)
    if req is not None and req.client is not None:
        check_rate_limit(req.client.host)
    
    # Obtener o crear configuración del cliente
    if client_id not in clients_config:
        # Usar template por defecto
        clients_config[client_id] = deepcopy(BUSINESS_TEMPLATES["restaurante"])
        clients_config[client_id]["business_name"] = "Demo Business"
        clients_config[client_id]["client_id"] = client_id
    
    client_config = clients_config[client_id]
    
    # Obtener historial de conversación
    conversation_history = get_or_create_conversation(phone, client_id)
    
    # Verificar si debe escalarse
    should_escalate_flag, escalation_reason = should_escalate(message, client_config)
    
    # Registrar mensaje del usuario
    user_message = {
        "role": "user",
        "content": message,
        "timestamp": datetime.now().isoformat()
    }
    conversation_history.append(user_message)
    
    # Generar respuesta con IA (a menos que sea para escalar inmediatamente)
    if should_escalate_flag:
        ai_response = f"Entiendo tu situación. Un miembro de nuestro equipo te contactará de inmediato para ayudarte. Gracias por tu paciencia."
    else:
        # Verificar respuestas automáticas rápidas
        message_lower = message.lower()
        quick_response = None
        for keyword, response in client_config.get("auto_responses", {}).items():
            if keyword in message_lower:
                quick_response = response
                break
        
        if quick_response:
            ai_response = quick_response
        else:
            ai_response = get_ai_response(message, conversation_history, client_config)
    
    # Registrar respuesta del bot
    bot_message = {
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now().isoformat()
    }
    conversation_history.append(bot_message)
    
    return BotResponse(
        response=ai_response,
        should_escalate=should_escalate_flag,
        escalation_reason=escalation_reason,
        conversation_id=f"{client_id}_{phone}",
        timestamp=datetime.now().isoformat()
    )

@app.post("/client/configure")
async def configure_client(config: ClientConfig, req: Request, _token: str = Depends(require_auth)):
    """
    Configura un nuevo cliente con su base de conocimiento.
    """
    # Rate limiting por IP
    if req.client is not None:
        check_rate_limit(req.client.host)
    clients_config[config.client_id] = {
        "business_name": config.business_name,
        "business_type": config.business_type,
        "knowledge_base": config.knowledge_base,
        "auto_responses": config.auto_responses,
        "escalation_keywords": config.escalation_keywords,
        "business_hours": config.business_hours,
        "client_id": config.client_id
    }
    
    return {
        "status": "configured",
        "client_id": config.client_id,
        "message": "Cliente configurado correctamente"
    }

@app.get("/client/{client_id}/config")
def get_client_config(client_id: str, req: Request, _token: str = Depends(require_auth)):
    """Obtiene la configuración de un cliente"""
    # Rate limiting por IP
    if req.client is not None:
        check_rate_limit(req.client.host)
    if client_id not in clients_config:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return clients_config[client_id]

@app.get("/conversation/{client_id}/{phone}")
def get_conversation_history(client_id: str, phone: str, req: Request, _token: str = Depends(require_auth)):
    """Obtiene el historial de conversación"""
    # Rate limiting por IP
    if req.client is not None:
        check_rate_limit(req.client.host)
    key = f"{client_id}_{phone}"
    if key not in conversations_store:
        return {"messages": [], "total": 0}
    
    return {
        "messages": conversations_store[key],
        "total": len(conversations_store[key])
    }

@app.delete("/conversation/{client_id}/{phone}")
def clear_conversation(client_id: str, phone: str, req: Request, _token: str = Depends(require_auth)):
    """Limpia el historial de conversación"""
    # Rate limiting por IP
    if req.client is not None:
        check_rate_limit(req.client.host)
    key = f"{client_id}_{phone}"
    if key in conversations_store:
        del conversations_store[key]
    return {"status": "cleared"}

@app.get("/templates")
def get_business_templates(req: Request, _token: str = Depends(require_auth)):
    """Lista los templates de negocio disponibles"""
    # Rate limiting por IP
    if req.client is not None:
        check_rate_limit(req.client.host)
    return {
        "templates": list(BUSINESS_TEMPLATES.keys()),
        "details": BUSINESS_TEMPLATES
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_conversations": len(conversations_store),
        "configured_clients": len(clients_config)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)