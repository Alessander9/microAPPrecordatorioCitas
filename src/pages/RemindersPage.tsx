import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting } from '../db/db';
import type { Client } from '../types/client';
import { DEFAULT_MESSAGE_TEMPLATE } from '../types/settings';
import { groupClientsByReminderDate } from '../lib/dateUtils';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { syncRemindersToServer, updateAppBadge } from '../lib/syncService';
import { ClientCard } from '../components/ClientCard';
import { SearchBar } from '../components/SearchBar';
import { ClientFormModal } from '../components/ClientFormModal';
import { RescheduleModal } from '../components/RescheduleModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { WhatsAppPromptModal } from '../components/WhatsAppPromptModal';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  AlertCircle, 
  CalendarCheck, 
  Clock, 
  Layers
} from 'lucide-react';

export const RemindersPage: React.FC = () => {
  const { grantTemporaryUnlockGrace } = useAuth();
  // Live query from Dexie
  const clients = useLiveQuery(() => db.clients.toArray(), []) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [template, setTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [therapistName, setTherapistName] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [reschedulingClient, setReschedulingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [promptWhatsAppClient, setPromptWhatsAppClient] = useState<Client | null>(null);

  // Load WhatsApp template and therapist name from settings
  useEffect(() => {
    getSetting<string>('messageTemplate', DEFAULT_MESSAGE_TEMPLATE).then(t => {
      if (t) setTemplate(t);
    });
    getSetting<string>('therapistName', '').then(tn => {
      if (tn) setTherapistName(tn);
    });
  }, []);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c => c.nombre.toLowerCase().includes(q));
  }, [clients, searchQuery]);

  // Group filtered clients
  const grouped = useMemo(() => {
    return groupClientsByReminderDate(filteredClients);
  }, [filteredClients]);

  // Calculate pending reminders (Hoy not yet reminded + all Atrasados) and update Badging API
  useEffect(() => {
    const pendingCount = 
      grouped.hoy.filter(c => !c.recordado).length + 
      grouped.atrasados.length;
    updateAppBadge(pendingCount);
  }, [grouped]);

  // CRUD Actions
  const handleSaveClient = async (
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'recordado' | 'fechaRecordado'> & { id?: string }
  ) => {
    const nowIso = new Date().toISOString();
    if (data.id) {
      // Update existing
      await db.clients.update(data.id, {
        nombre: data.nombre,
        whatsapp: data.whatsapp,
        fechaAtencion: data.fechaAtencion,
        fechaProximaCita: data.fechaProximaCita,
        notas: data.notas,
        updatedAt: nowIso,
      });
    } else {
      // Create new
      const newClient: Client = {
        id: crypto.randomUUID(),
        nombre: data.nombre,
        whatsapp: data.whatsapp,
        fechaAtencion: data.fechaAtencion,
        fechaProximaCita: data.fechaProximaCita,
        notas: data.notas,
        recordado: false,
        fechaRecordado: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await db.clients.add(newClient);
    }
    syncRemindersToServer();
  };

  const handleToggleRecordado = async (client: Client) => {
    const nextState = !client.recordado;
    const nowIso = new Date().toISOString();
    await db.clients.update(client.id, {
      recordado: nextState,
      fechaRecordado: nextState ? nowIso : null,
      updatedAt: nowIso,
    });
    syncRemindersToServer();
  };

  const handleConfirmReschedule = async (clientId: string, newDate: string) => {
    const nowIso = new Date().toISOString();
    await db.clients.update(clientId, {
      fechaProximaCita: newDate,
      recordado: false,
      fechaRecordado: null,
      updatedAt: nowIso,
    });
    syncRemindersToServer();
  };

  const handleDeleteClient = async (clientId: string) => {
    await db.clients.delete(clientId);
    syncRemindersToServer();
  };

  const handleOpenWhatsApp = (client: Client) => {
    grantTemporaryUnlockGrace(90); // 90 seconds grace window to write in WhatsApp and return without PIN lock
    const url = buildWhatsAppUrl(client.whatsapp, client.nombre, client.fechaProximaCita, template, therapistName);
    window.open(url, '_blank', 'noopener,noreferrer');
    // Prompt to mark as reminded if not already marked
    if (!client.recordado) {
      setPromptWhatsAppClient(client);
    }
  };

  const handleMarkRemindedFromWhatsApp = async (clientId: string) => {
    const nowIso = new Date().toISOString();
    await db.clients.update(clientId, {
      recordado: true,
      fechaRecordado: nowIso,
      updatedAt: nowIso,
    });
    syncRemindersToServer();
  };

  const totalClientsCount = clients.length;
  const hasAnyClients = totalClientsCount > 0;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top action bar: Search and Add button */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            totalCount={totalClientsCount}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingClient(null);
            setIsFormOpen(true);
          }}
          className="flex-shrink-0 py-2.5 px-4 rounded-2xl bg-gold-500 hover:bg-gold-400 active:scale-95 text-navy-950 font-bold text-xs shadow-md shadow-gold-500/20 flex items-center gap-1.5 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo cliente</span>
        </button>
      </div>

      {/* Empty State */}
      {!hasAnyClients && (
        <div className="text-center py-12 px-6 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 shadow-sm max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/10 text-gold-500 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-navy-900 dark:text-white">
            Comienza a agendar tus sesiones
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-6 max-w-xs mx-auto leading-relaxed">
            Registra a tus clientes con la fecha de su próxima cita. La app te recordará a quién escribirle por WhatsApp.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setIsFormOpen(true);
            }}
            className="py-3 px-6 rounded-xl bg-navy-900 dark:bg-gold-500 text-white dark:text-navy-950 text-xs font-bold shadow-md hover:opacity-90 transition inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Registrar mi primer cliente
          </button>
        </div>
      )}

      {/* No search results */}
      {hasAnyClients && filteredClients.length === 0 && (
        <div className="text-center py-8 text-xs text-slate-400">
          No se encontraron clientes que coincidan con &quot;{searchQuery}&quot;.
        </div>
      )}

      {/* Section 1: Hoy */}
      {grouped.hoy.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-pulse" />
            <h2 className="text-sm font-bold text-navy-900 dark:text-white flex items-center gap-1.5">
              Hoy
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-700 dark:text-gold-300">
                {grouped.hoy.length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.hoy.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                category="hoy"
                onWhatsApp={handleOpenWhatsApp}
                onToggleRecordado={handleToggleRecordado}
                onReagendar={c => setReschedulingClient(c)}
                onEdit={c => {
                  setEditingClient(c);
                  setIsFormOpen(true);
                }}
                onDelete={c => setDeletingClient(c)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Atrasados */}
      {grouped.atrasados.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              Atrasados (pendientes de recordar)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                {grouped.atrasados.length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.atrasados.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                category="atrasados"
                onWhatsApp={handleOpenWhatsApp}
                onToggleRecordado={handleToggleRecordado}
                onReagendar={c => setReschedulingClient(c)}
                onEdit={c => {
                  setEditingClient(c);
                  setIsFormOpen(true);
                }}
                onDelete={c => setDeletingClient(c)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Próximos 7 días */}
      {grouped.proximos7Dias.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-navy-600 dark:text-gold-400" />
            <h2 className="text-sm font-bold text-navy-900 dark:text-white flex items-center gap-1.5">
              Próximos 7 días
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-navy-800 text-slate-700 dark:text-slate-300">
                {grouped.proximos7Dias.length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.proximos7Dias.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                category="proximos7Dias"
                onWhatsApp={handleOpenWhatsApp}
                onToggleRecordado={handleToggleRecordado}
                onReagendar={c => setReschedulingClient(c)}
                onEdit={c => {
                  setEditingClient(c);
                  setIsFormOpen(true);
                }}
                onDelete={c => setDeletingClient(c)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 4: Resto */}
      {grouped.resto.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              Resto de citas
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-navy-800/80 text-slate-500">
                {grouped.resto.length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.resto.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                category="resto"
                onWhatsApp={handleOpenWhatsApp}
                onToggleRecordado={handleToggleRecordado}
                onReagendar={c => setReschedulingClient(c)}
                onEdit={c => {
                  setEditingClient(c);
                  setIsFormOpen(true);
                }}
                onDelete={c => setDeletingClient(c)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        clientToEdit={editingClient}
      />

      <RescheduleModal
        client={reschedulingClient}
        isOpen={Boolean(reschedulingClient)}
        onClose={() => setReschedulingClient(null)}
        onConfirm={handleConfirmReschedule}
      />

      <DeleteConfirmModal
        client={deletingClient}
        isOpen={Boolean(deletingClient)}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDeleteClient}
      />

      <WhatsAppPromptModal
        client={promptWhatsAppClient}
        isOpen={Boolean(promptWhatsAppClient)}
        onClose={() => setPromptWhatsAppClient(null)}
        onMarkReminded={handleMarkRemindedFromWhatsApp}
      />
    </div>
  );
};
