import React, { useState, useEffect, useRef } from 'react';
import type { Client } from '../types/client';
import { 
  sendAssistantMessage, 
  AssistantMessage 
} from '../lib/assistantService';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { formatSpanishDate } from '../lib/dateUtils';
import { getSetting } from '../db/db';
import { DEFAULT_MESSAGE_TEMPLATE } from '../types/settings';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Calendar,
  Phone,
  MessageSquare,
  Bot,
  User,
  CheckCircle2
} from 'lucide-react';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
}

export const AssistantModal: React.FC<AssistantModalProps> = ({
  isOpen,
  onClose,
  clients,
}) => {
  const { grantTemporaryUnlockGrace } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola! Soy tu asistente de consultorio impulsado por DeepSeek. Puedo ayudarte a agendar citas, reprogramar pacientes, cambiar datos, eliminar registros o decirte a quién debes escribirle hoy. ¿En qué te ayudo?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [therapistName, setTherapistName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      getSetting<string>('messageTemplate', DEFAULT_MESSAGE_TEMPLATE).then(t => {
        if (t) setTemplate(t);
      });
      getSetting<string>('therapistName', '').then(tn => {
        if (tn) setTherapistName(tn);
      });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch {}
    }

    const userMsg: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      const apiHistory = newHistory.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAssistantMessage(apiHistory, clients);

      const assistantMsg: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        actionResult: res.actionResult,
        isLocalFallback: res.isLocalFallback,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Ocurrió un error inesperado: ${err.message || 'Error de conexión'}.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Conversación reiniciada. ¿Qué paciente o recordatorio deseas gestionar ahora?',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const openWhatsAppForClient = (client: Partial<Client>) => {
    if (!client.whatsapp || !client.nombre) return;
    grantTemporaryUnlockGrace(90);
    const url = buildWhatsAppUrl(
      client.whatsapp,
      client.nombre,
      client.fechaProximaCita || '',
      template,
      therapistName
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full sm:max-w-xl md:max-w-2xl h-[92vh] sm:h-[680px] bg-white dark:bg-navy-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-navy-800 flex flex-col overflow-hidden animate-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 text-white flex items-center justify-between border-b border-navy-700/60 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 text-navy-950 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-navy-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight text-white leading-none">
                  Asistente de Citas
                </h3>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  DeepSeek IA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-normal mt-0.5">
                Crea, reprograma, edita o elimina con lenguaje natural
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-navy-800/80 transition"
              title="Limpiar conversación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-navy-800/80 transition"
              title="Cerrar asistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggestions chips */}
        <div className="px-3 py-2 bg-slate-50 dark:bg-navy-950/60 border-b border-slate-200/60 dark:border-navy-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            type="button"
            onClick={() => handleQuickPrompt('¿A quiénes debo escribirle hoy?')}
            className="flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-200 hover:border-gold-500 hover:text-gold-600 transition"
          >
            📅 Citas de hoy
          </button>
          <button
            type="button"
            onClick={() => handleQuickPrompt('Crea una cita para Juan Pérez al 987654321 el próximo martes')}
            className="flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-200 hover:border-gold-500 hover:text-gold-600 transition"
          >
            ➕ Agendar cita ejemplo
          </button>
          <button
            type="button"
            onClick={() => handleQuickPrompt('¿Cuáles son los recordatorios atrasados o vencidos?')}
            className="flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-200 hover:border-gold-500 hover:text-gold-600 transition"
          >
            ⚠️ Recordatorios vencidos
          </button>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-navy-950/40">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-gold-500 to-amber-300 text-navy-950 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-2 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-navy-900 text-white rounded-br-xs dark:bg-gold-500 dark:text-navy-950 font-medium'
                    : 'bg-white dark:bg-navy-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-navy-700/80 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Tarjetas de Acción Interactiva */}
                {msg.actionResult && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-navy-700/60">
                    {/* 1. Cliente Creado o Reprogramado */}
                    {msg.actionResult.client && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy-900 dark:text-gold-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {msg.actionResult.client.nombre}
                          </span>
                          {msg.actionResult.type === 'created' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Agendado
                            </span>
                          )}
                          {msg.actionResult.type === 'rescheduled' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              Reprogramado
                            </span>
                          )}
                        </div>

                        {msg.actionResult.client.fechaProximaCita && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-gold-500" />
                            <span>
                              Próxima cita:{' '}
                              <strong>
                                {formatSpanishDate(msg.actionResult.client.fechaProximaCita)}
                              </strong>
                            </span>
                          </div>
                        )}

                        {msg.actionResult.client.whatsapp && (
                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {msg.actionResult.client.whatsapp}
                            </span>
                            <button
                              type="button"
                              onClick={() => openWhatsAppForClient(msg.actionResult!.client!)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. Lista de Clientes */}
                    {msg.actionResult.clientsList && msg.actionResult.clientsList.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {msg.actionResult.clientsList.map(c => (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <p className="font-semibold text-navy-900 dark:text-white">{c.nombre}</p>
                              <p className="text-[10px] text-slate-400">
                                {formatSpanishDate(c.fechaProximaCita)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openWhatsAppForClient(c)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 hover:bg-emerald-500 transition"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              Escribir
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-gold-500 to-amber-300 text-navy-950 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700/80 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-slate-400 font-medium ml-1">
                  Procesando con DeepSeek...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-navy-900 border-t border-slate-200/80 dark:border-navy-800/80 flex-shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ej: 'Crea cita para Valeria al 987654321 el viernes'..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-navy-900 dark:bg-gold-500 text-white dark:text-navy-950 hover:opacity-90 disabled:opacity-40 transition shadow-md active:scale-95 flex-shrink-0"
              title="Enviar al Asistente"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
