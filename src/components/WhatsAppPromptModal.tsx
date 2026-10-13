import React from 'react';
import type { Client } from '../types/client';
import { MessageSquareCheck, Check, X } from 'lucide-react';

interface WhatsAppPromptModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkReminded: (clientId: string) => Promise<void>;
}

export const WhatsAppPromptModal: React.FC<WhatsAppPromptModalProps> = ({
  client,
  isOpen,
  onClose,
  onMarkReminded,
}) => {
  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-navy-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 text-center">
        
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
          <MessageSquareCheck className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-navy-900 dark:text-white">
          ¿Marcar como recordado?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-6">
          Se abrió WhatsApp para <strong className="text-slate-700 dark:text-slate-200">{client.nombre}</strong>. ¿Deseas actualizar su estado para que no aparezca pendiente?
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            No por ahora
          </button>
          <button
            type="button"
            onClick={async () => {
              await onMarkReminded(client.id);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Sí, marcar
          </button>
        </div>
      </div>
    </div>
  );
};
