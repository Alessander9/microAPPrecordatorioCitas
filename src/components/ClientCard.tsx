import React from 'react';
import type { Client } from '../types/client';
import { formatSpanishDate, getRelativeDateLabel } from '../lib/dateUtils';
import { formatPhoneDisplay } from '../lib/whatsapp';
import { 
  MessageCircle, 
  CheckCircle2, 
  CalendarClock, 
  CalendarCheck, 
  Calendar,
  Pencil, 
  Trash2, 
  FileText,
  RotateCcw,
  Bell,
  AlertTriangle,
  Phone
} from 'lucide-react';

interface ClientCardProps {
  client: Client;
  category: 'hoy' | 'atrasados' | 'proximos7Dias' | 'resto';
  onWhatsApp: (client: Client) => void;
  onToggleRecordado: (client: Client) => void;
  onReagendar: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  category,
  onWhatsApp,
  onToggleRecordado,
  onReagendar,
  onEdit,
  onDelete,
}) => {
  const isHoy = category === 'hoy';
  const isAtrasado = category === 'atrasados';
  const relativeLabel = getRelativeDateLabel(client.fechaProximaCita);
  const formattedPhone = formatPhoneDisplay(client.whatsapp);

  // Iniciales del paciente para el avatar
  const initials = client.nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || '•';

  return (
    <div
      className={`relative rounded-3xl p-5 transition-all duration-200 border bg-white dark:bg-navy-900 shadow-sm hover:shadow-md flex flex-col justify-between ${
        isHoy
          ? 'border-amber-500/70 dark:border-amber-500/60 ring-2 ring-amber-500/20'
          : isAtrasado
          ? 'border-rose-400/60 dark:border-rose-900/70 ring-1 ring-rose-500/20'
          : 'border-slate-200 dark:border-navy-800'
      }`}
    >
      <div>
        {/* 1. Cabecera: Avatar, Nombre, Teléfono y Estado */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar con iniciales */}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs ${
              client.recordado
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : isHoy
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                : isAtrasado
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                : 'bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-navy-700'
            }`}>
              {initials}
            </div>

            {/* Nombre y teléfono */}
            <div className="min-w-0">
              <h3 className="font-bold text-base text-navy-900 dark:text-white leading-tight truncate">
                {client.nombre}
              </h3>
              {formattedPhone && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="font-mono tracking-tight">{formattedPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Insignia de Estado Superior */}
          <div className="flex-shrink-0">
            {client.recordado ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Avisado</span>
              </span>
            ) : isHoy ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-navy-950 shadow-xs">
                <Bell className="w-3.5 h-3.5" />
                <span>Toca hoy</span>
              </span>
            ) : isAtrasado ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Atrasado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300 border border-slate-200 dark:border-navy-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{relativeLabel || 'Programado'}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Cuadro de Fechas: Última atención y Próxima cita */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-navy-800/50 border border-slate-100 dark:border-navy-800 text-xs">
          {/* Última atención */}
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">
                Última atención
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize truncate block">
                {client.fechaAtencion ? formatSpanishDate(client.fechaAtencion) : 'No especificada'}
              </span>
            </div>
          </div>

          {/* Próxima cita / Recordatorio */}
          <div className="flex items-start gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isHoy 
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                : isAtrasado 
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' 
                : 'bg-slate-200/50 dark:bg-navy-700 text-slate-600 dark:text-slate-300'
            }`}>
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">
                Próxima cita
              </span>
              <span className={`font-bold capitalize truncate block ${
                isHoy 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : isAtrasado 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-navy-900 dark:text-slate-100'
              }`}>
                {formatSpanishDate(client.fechaProximaCita)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Cuadro de Notas / Motivo Clínico (claramente rotulado) */}
        {client.notas && (
          <div className="mb-3.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/5 dark:bg-navy-800/70 border border-amber-500/20 dark:border-navy-700 text-xs">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Notas clínicas / Motivo</span>
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed italic break-words">
              &ldquo;{client.notas}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* 4. Bloque de Acciones Claras */}
      <div className="pt-3 border-t border-slate-100 dark:border-navy-800 space-y-2.5">
        
        {/* Acciones Principales de Recordatorio */}
        {!client.recordado ? (
          /* Estado: PENDIENTE */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Botón WhatsApp */}
            <button
              type="button"
              onClick={() => onWhatsApp(client)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              title="Abre WhatsApp con el mensaje ya redactado"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Enviar WhatsApp</span>
            </button>

            {/* Botón Marcar Avisado */}
            <button
              type="button"
              onClick={() => onToggleRecordado(client)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-navy-800 dark:hover:bg-navy-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              title="Marcar como avisado si ya le escribiste o llamaste"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Marcar como avisado</span>
            </button>
          </div>
        ) : (
          /* Estado: YA RECORDADO */
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="flex items-center gap-2 px-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Recordatorio ya enviado
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onWhatsApp(client)}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition flex items-center gap-1"
                title="Volver a abrir WhatsApp para este paciente"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Reenviar</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleRecordado(client)}
                className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-navy-800 transition flex items-center gap-1"
                title="Desmarcar y volver a poner en estado pendiente"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desmarcar</span>
              </button>
            </div>
          </div>
        )}

        {/* Barra de Acciones Secundarias con Texto Explícito (Reagendar, Editar, Eliminar) */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-navy-800/80 text-xs">
          <button
            type="button"
            onClick={() => onReagendar(client)}
            className="py-1.5 px-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-navy-800 font-semibold transition flex items-center gap-1.5"
            title="Cambiar o posponer fecha de la próxima cita"
          >
            <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
            <span>Reagendar</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(client)}
            className="py-1.5 px-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-800 font-semibold transition flex items-center gap-1.5"
            title="Editar nombre, teléfono, fechas o notas del cliente"
          >
            <Pencil className="w-3.5 h-3.5 text-sky-500" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(client)}
            className="py-1.5 px-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition flex items-center gap-1.5"
            title="Eliminar este cliente definitivamente"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Eliminar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
