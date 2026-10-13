import React from 'react';
import type { Client } from '../types/client';
import { formatSpanishDate } from '../lib/dateUtils';
import { 
  MessageCircle, 
  CheckCircle2, 
  Circle, 
  CalendarClock, 
  Pencil, 
  Trash2, 
  FileText
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

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all duration-200 border bg-white dark:bg-navy-900 shadow-sm hover:shadow-md ${
        isHoy
          ? 'border-gold-500/60 dark:border-gold-500/50 ring-1 ring-gold-500/30'
          : isAtrasado
          ? 'border-rose-400/50 dark:border-rose-900/50'
          : 'border-slate-200 dark:border-navy-800'
      }`}
    >
      {/* Top row: Client name and Status badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-base text-navy-900 dark:text-white leading-tight">
            {client.nombre}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Próxima cita:{' '}
            <span className={`font-semibold capitalize ${isHoy ? 'text-gold-600 dark:text-gold-400' : isAtrasado ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
              {formatSpanishDate(client.fechaProximaCita)}
            </span>
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {client.recordado ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="w-3 h-3" />
              Recordado
            </span>
          ) : isHoy ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gold-500 text-navy-950 shadow-sm">
              ¡Hoy!
            </span>
          ) : isAtrasado ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              Atrasado
            </span>
          ) : null}
        </div>
      </div>

      {/* Notes preview if available */}
      {client.notas && (
        <div className="mt-2 mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-100 dark:border-navy-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="line-clamp-2 italic">{client.notas}</p>
        </div>
      )}

      {/* Action buttons row - mobile-first large tactile buttons */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between gap-1.5 flex-wrap">
        
        {/* Left primary action buttons */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          {/* WhatsApp Button */}
          <button
            type="button"
            onClick={() => onWhatsApp(client)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
            title="Escribir por WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp</span>
          </button>

          {/* Toggle recordado button */}
          <button
            type="button"
            onClick={() => onToggleRecordado(client)}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition ${
              client.recordado
                ? 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-navy-700'
                : 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-500/30 hover:bg-gold-500/20'
            }`}
            title={client.recordado ? 'Desmarcar recordatorio' : 'Marcar como recordado'}
          >
            {client.recordado ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Listo</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5" />
                <span>Recordado</span>
              </>
            )}
          </button>
        </div>

        {/* Right utility buttons: Reagendar, Editar, Eliminar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onReagendar(client)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-gold-400 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
            title="Reagendar cita"
          >
            <CalendarClock className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(client)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition"
            title="Editar cliente"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(client)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            title="Eliminar cliente"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
