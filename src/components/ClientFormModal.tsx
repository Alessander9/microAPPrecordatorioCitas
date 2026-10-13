import React, { useState, useEffect } from 'react';
import type { Client } from '../types/client';
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from '../lib/whatsapp';
import { format, addDays } from 'date-fns';
import { X, Calendar, Phone, User, FileText, Check } from 'lucide-react';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'recordado' | 'fechaRecordado'> & { id?: string }) => Promise<void>;
  clientToEdit?: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientToEdit,
}) => {
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [fechaAtencion, setFechaAtencion] = useState('');
  const [fechaProximaCita, setFechaProximaCita] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setNombre(clientToEdit.nombre);
      setWhatsapp(clientToEdit.whatsapp);
      setFechaAtencion(clientToEdit.fechaAtencion);
      setFechaProximaCita(clientToEdit.fechaProximaCita);
      setNotas(clientToEdit.notas || '');
    } else {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const nextWeekStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      setNombre('');
      setWhatsapp('51');
      setFechaAtencion(todayStr);
      setFechaProximaCita(nextWeekStr);
      setNotas('');
    }
    setError(null);
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('Por favor ingresa el nombre del cliente.');
      return;
    }

    if (!isValidWhatsAppNumber(whatsapp)) {
      setError('El número de WhatsApp no es válido (ej. 987654321 o 51987654321).');
      return;
    }

    if (!fechaAtencion) {
      setError('Por favor ingresa la fecha de atención.');
      return;
    }

    if (!fechaProximaCita) {
      setError('Por favor ingresa la fecha de la próxima cita.');
      return;
    }

    if (notas.length > 140) {
      setError('Las notas no pueden exceder 140 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedPhone = normalizeWhatsAppNumber(whatsapp);
      await onSave({
        id: clientToEdit?.id,
        nombre: nombre.trim(),
        whatsapp: normalizedPhone,
        fechaAtencion,
        fechaProximaCita,
        notas: notas.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-navy-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-navy-800 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-navy-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900 dark:text-white">
            {clientToEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gold-500" />
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Valeria Mendoza"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-500" />
              WhatsApp (Perú +51 por defecto)
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="51987654321 o 987654321"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Si escribes 9 dígitos (ej. 987654321) se agregará automáticamente el código 51 de Perú.
            </p>
          </div>

          {/* Fechas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Fecha de atención
              </label>
              <input
                type="date"
                required
                value={fechaAtencion}
                onChange={e => setFechaAtencion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gold-500" />
                Próxima cita
              </label>
              <input
                type="date"
                required
                value={fechaProximaCita}
                onChange={e => setFechaProximaCita(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Notas opcionales
              </label>
              <span className={`text-[11px] ${notas.length > 140 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {notas.length}/140
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={140}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej. Revisar ejercicios de respiración y hábitos de sueño..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : clientToEdit ? 'Actualizar' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
