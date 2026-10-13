import React, { useState } from 'react';
import type { Client } from '../types/client';
import { formatSpanishDate } from '../lib/dateUtils';
import { format, addDays, parseISO } from 'date-fns';
import { Calendar, X, Clock, Check } from 'lucide-react';

interface RescheduleModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clientId: string, newDate: string) => Promise<void>;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  client,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !client) return null;

  const [newDate, setNewDate] = useState(() => {
    try {
      const parsed = parseISO(`${client.fechaProximaCita}T00:00:00`);
      return format(addDays(parsed, 7), 'yyyy-MM-dd');
    } catch {
      return format(addDays(new Date(), 7), 'yyyy-MM-dd');
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyOffset = (days: number) => {
    const today = new Date();
    setNewDate(format(addDays(today, days), 'yyyy-MM-dd'));
  };

  const handleSave = async () => {
    if (!newDate) return;
    try {
      setIsSubmitting(true);
      await onConfirm(client.id, newDate);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-navy-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900 dark:text-white">Reagendar sesión</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{client.nombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-navy-800/60 p-3 rounded-xl">
            Cita actual: <span className="font-semibold text-navy-900 dark:text-slate-200">{formatSpanishDate(client.fechaProximaCita)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gold-500" />
              Nueva fecha de próxima cita
            </label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          {/* Quick buttons */}
          <div>
            <p className="text-[11px] font-medium text-slate-400 mb-2">Accesos rápidos desde hoy:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyOffset(7)}
                className="py-2 px-3 text-xs rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 hover:bg-gold-500/10 hover:text-gold-600 transition font-medium"
              >
                + 1 semana
              </button>
              <button
                type="button"
                onClick={() => applyOffset(14)}
                className="py-2 px-3 text-xs rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 hover:bg-gold-500/10 hover:text-gold-600 transition font-medium"
              >
                + 2 semanas
              </button>
              <button
                type="button"
                onClick={() => applyOffset(28)}
                className="py-2 px-3 text-xs rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 hover:bg-gold-500/10 hover:text-gold-600 transition font-medium"
              >
                + 1 mes
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-navy-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || !newDate}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-md flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Reagendar'}
          </button>
        </div>
      </div>
    </div>
  );
};
