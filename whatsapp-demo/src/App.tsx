import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

// Types
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  shouldEscalate?: boolean;
  escalationReason?: string;
  error?: boolean;
}

interface BotResponse {
  response: string;
  should_escalate: boolean;
  escalation_reason: string | null;
  conversation_id: string;
  timestamp: string;
}

type BusinessType = 'restaurante' | 'tienda' | 'inmobiliaria';

interface QuickReplies {
  [key: string]: string[];
}

const WhatsAppBotDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Bienvenido a Demo Restaurante. ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [phoneNumber] = useState<string>('+34600123456');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurante');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const normalizeBaseUrl = (value: string): string => {
    if (!/^https?:\/\//i.test(value)) {
      return `https://${value.replace(/\/+$/, '')}`;
    }
    return value.replace(/\/+$/, '');
  };

  const buildApiUrl = (path: string): string => {
    const raw = import.meta.env.VITE_API_URL;
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error('Configura VITE_API_URL en el frontend con la URL del backend segura.');
    }
    const base = normalizeBaseUrl(raw.trim());
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  };

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickReplies: QuickReplies = {
    restaurante: ['Horario', 'Reserva', 'Menú del día', 'Precios'],
    tienda: ['Horario', 'Envíos', 'Devoluciones', 'Catálogo'],
    inmobiliaria: ['Quiero alquilar', 'Quiero comprar', 'Agendar visita', 'Zona disponible']
  };

  const handleSendMessage = async (messageText: string = inputMessage): Promise<void> => {
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('phone', phoneNumber);
      formData.append('client_id', businessType);

      // Construir la URL correctamente hacia el backend en Railway
      const url = buildApiUrl('message/send');

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        cache: 'no-store'
      });

      if (!response.ok) throw new Error(`Error en la respuesta: ${response.status}`);

      const data: BotResponse = await response.json();

      const botMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp,
        shouldEscalate: data.should_escalate,
        escalationReason: data.escalation_reason || undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Disculpa, tengo problemas técnicos. Intenta de nuevo.',
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetConversation = (): void => {
    setMessages([
      {
        role: 'assistant',
        content: '¡Hola! 👋 Bienvenido. ¿En qué puedo ayudarte?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-whatsapp-50 via-white to-whatsapp-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-whatsapp-primary rounded-full flex items-center justify-center shadow-lg">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-800 text-shadow">
                WhatsApp AI Bot Demo
              </h1>
              <p className="text-whatsapp-secondary font-medium">
                Bot inteligente que responde automáticamente en WhatsApp Business
              </p>
            </div>
          </div>
        </div>

        {/* Business Type Selector */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100 animate-slide-up">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">Tipo de Negocio (Demo):</h3>
          <div className="flex gap-4 flex-wrap justify-center">
            {(['restaurante', 'tienda', 'inmobiliaria'] as BusinessType[]).map(type => (
              <button
                key={type}
                onClick={() => {
                  setBusinessType(type);
                  resetConversation();
                }}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  businessType === type
                    ? 'bg-whatsapp-primary text-white shadow-lg ring-2 ring-whatsapp-primary ring-opacity-50'
                    : 'bg-gray-50 text-gray-700 hover:bg-whatsapp-50 hover:text-whatsapp-dark border border-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-slide-up">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-whatsapp-primary to-whatsapp-secondary text-white p-6 relative">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-white ring-opacity-30">
                <Bot className="w-8 h-8 text-whatsapp-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl">Asistente Virtual</h3>
                <p className="text-sm opacity-90 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                  Siempre en línea
                </p>
              </div>
              <div className="text-right text-sm opacity-75">
                <p>Demo</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="p-6 space-y-4 overflow-y-auto whatsapp-bg custom-scrollbar"
            style={{ 
              height: '500px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4ccc4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex mb-4 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-whatsapp-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`relative px-4 py-3 rounded-2xl shadow-lg ${
                      msg.role === 'user'
                        ? 'bg-whatsapp-light text-gray-800 rounded-br-md'
                        : msg.error
                        ? 'bg-red-100 text-red-800 border border-red-200 rounded-bl-md'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                    }`}
                  >
                    <div className="space-y-2">
                      <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.timestamp)}
                        </span>
                        {msg.role === 'user' && (
                          <div className="flex">
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                      
                      {msg.shouldEscalate && msg.escalationReason && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-200">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Escalado a humano: {msg.escalationReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start mb-4 animate-fade-in">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 bg-whatsapp-primary rounded-full flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-gray-100">
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-whatsapp-50 border-t border-gray-200">
            <div className="flex gap-2 flex-wrap justify-center">
              {quickReplies[businessType].map((reply: string) => (
                <button
                  key={reply}
                  onClick={() => handleSendMessage(reply)}
                  disabled={loading}
                  className="px-4 py-2 bg-white border-2 border-whatsapp-200 text-whatsapp-dark rounded-full text-sm font-medium hover:bg-whatsapp-primary hover:text-white hover:border-whatsapp-primary transition-all duration-200 disabled:opacity-50 shadow-sm transform hover:scale-105"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  disabled={loading}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-full focus:outline-none focus:border-whatsapp-primary focus:ring-2 focus:ring-whatsapp-primary focus:ring-opacity-20 disabled:opacity-50 transition-all duration-200 text-sm"
                />
                {inputMessage.trim() && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-whatsapp-primary rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                className="bg-whatsapp-primary text-white p-3 rounded-full hover:bg-whatsapp-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg transform hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition-all duration-300 border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-whatsapp-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">Respuestas 24/7</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Atiende clientes automáticamente sin descanso</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition-all duration-300 border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">IA Contextual</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Recuerda conversaciones y entiende contexto</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform hover:scale-105 transition-all duration-300 border border-gray-100 group">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">Escalado Inteligente</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Detecta cuando necesita intervención humana</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <p className="text-gray-700 font-medium">Desarrollado por Jorge Lago Campos</p>
            <p className="mt-2 text-sm text-gray-500">Demo - Backend en localhost:8003</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>Activar Windows</span>
              <span>Ve a Configuración para activar Windows.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBotDemo;