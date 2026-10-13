import React from 'react';
import type { Client } from '../types/client';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clientId: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  client,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-navy-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-navy-900 dark:text-white">
          ¿Eliminar cliente?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">
          Se eliminarán los datos de <strong className="text-slate-700 dark:text-slate-200">{client.nombre}</strong> de forma permanente de tu dispositivo.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm(client.id);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
