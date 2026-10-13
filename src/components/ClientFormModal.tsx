import React, { useState, useEffect } from 'react';
import type { Client } from '../types/client';
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from '../lib/whatsapp';
import { formatSpanishDate, calculateDaysBetween } from '../lib/dateUtils';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { X, Calendar, Phone, User, FileText, Check, Clock, Sparkles } from 'lucide-react';

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

  // Quick preset setters for Fecha de Atención
  const setAtencionToday = () => setFechaAtencion(format(new Date(), 'yyyy-MM-dd'));
  const setAtencionYesterday = () => setFechaAtencion(format(subDays(new Date(), 1), 'yyyy-MM-dd'));

  // Quick preset setters for Fecha de Recordatorio (offset from fechaAtencion or today)
  const setNextCitaOffset = (days: number) => {
    try {
      const baseDate = fechaAtencion ? parseISO(`${fechaAtencion}T00:00:00`) : new Date();
      setFechaProximaCita(format(addDays(baseDate, days), 'yyyy-MM-dd'));
    } catch {
      setFechaProximaCita(format(addDays(new Date(), days), 'yyyy-MM-dd'));
    }
  };

  // Days difference between attention and reminder
  const daysInterval = fechaAtencion && fechaProximaCita ? calculateDaysBetween(fechaAtencion, fechaProximaCita) : 0;

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

    if (notas.length > 500) {
      setError('Las notas no pueden exceder 500 caracteres.');
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-navy-900 dark:text-white">
              {clientToEdit ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gold-500" />
              Nombre del paciente / cliente
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Valeria Mendoza"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-500" />
              WhatsApp (Perú +51 por defecto)
            </label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="51987654321 o 987654321"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          {/* Calendario: 1. Fecha de Atención */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-navy-800/40 border border-slate-200 dark:border-navy-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Fecha de atención (última sesión)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={setAtencionToday}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-200/80 dark:bg-navy-700 text-slate-700 dark:text-slate-300 hover:bg-gold-500/10 hover:text-gold-600 transition"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={setAtencionYesterday}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-200/80 dark:bg-navy-700 text-slate-700 dark:text-slate-300 hover:bg-gold-500/10 hover:text-gold-600 transition"
                >
                  Ayer
                </button>
              </div>
            </div>

            <input
              type="date"
              required
              value={fechaAtencion}
              onChange={e => setFechaAtencion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
            {fechaAtencion && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                {formatSpanishDate(fechaAtencion)}
              </p>
            )}
          </div>

          {/* Calendario: 2. Fecha de Próxima Cita / Recordatorio */}
          <div className="p-3.5 rounded-2xl bg-gold-500/5 dark:bg-gold-500/5 border border-gold-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy-900 dark:text-gold-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gold-500" />
                Fecha de recordatorio / próxima cita
              </label>
            </div>

            {/* Accesos rápidos de intervalo */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setNextCitaOffset(7)}
                className="py-1.5 px-2 rounded-lg text-center text-[11px] font-semibold bg-white dark:bg-navy-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700 hover:border-gold-500 hover:text-gold-600 transition"
                title="En 7 días"
              >
                +1 sem
              </button>
              <button
                type="button"
                onClick={() => setNextCitaOffset(14)}
                className="py-1.5 px-2 rounded-lg text-center text-[11px] font-semibold bg-white dark:bg-navy-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700 hover:border-gold-500 hover:text-gold-600 transition"
                title="En 14 días"
              >
                +2 sem
              </button>
              <button
                type="button"
                onClick={() => setNextCitaOffset(21)}
                className="py-1.5 px-2 rounded-lg text-center text-[11px] font-semibold bg-white dark:bg-navy-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700 hover:border-gold-500 hover:text-gold-600 transition"
                title="En 21 días"
              >
                +3 sem
              </button>
              <button
                type="button"
                onClick={() => setNextCitaOffset(28)}
                className="py-1.5 px-2 rounded-lg text-center text-[11px] font-semibold bg-white dark:bg-navy-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700 hover:border-gold-500 hover:text-gold-600 transition"
                title="En 28 días"
              >
                +1 mes
              </button>
            </div>

            <input
              type="date"
              required
              value={fechaProximaCita}
              onChange={e => setFechaProximaCita(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />

            {/* Resumen dinámico del tratamiento */}
            {fechaProximaCita && (
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-navy-900 dark:text-gold-300 capitalize">
                  {formatSpanishDate(fechaProximaCita)}
                </span>
                {daysInterval > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    En {daysInterval} días
                  </span>
                ) : daysInterval === 0 ? (
                  <span className="text-gold-600 font-bold">Mismo día</span>
                ) : (
                  <span className="text-rose-500 font-medium">Anterior a la atención</span>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Notas clínicas / temas a tratar
              </label>
              <span className={`text-[11px] ${notas.length > 500 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {notas.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej. Revisar tareas de respiración, avance del tratamiento, acuerdos de la sesión..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-y"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : clientToEdit ? 'Actualizar cita' : 'Guardar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
