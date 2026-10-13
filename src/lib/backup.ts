import { db, getSetting, setSetting } from '../db/db';
import type { Client } from '../types/client';
import { DEFAULT_MESSAGE_TEMPLATE } from '../types/settings';
import { syncRemindersToServer } from './syncService';

export interface BackupData {
  version: number;
  exportedAt: string;
  clients: Client[];
  messageTemplate?: string;
}

/**
 * Generates and downloads a JSON file containing all clients and message template.
 */
export async function exportBackup(): Promise<void> {
  const clients = await db.clients.toArray();
  const messageTemplate = (await getSetting<string>('messageTemplate')) || DEFAULT_MESSAGE_TEMPLATE;

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    clients,
    messageTemplate,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateSlug = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo-citas-${dateSlug}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and imports clients from a backup file, replacing existing records.
 */
export async function importBackup(file: File): Promise<{
  success: boolean;
  clientCount?: number;
  error?: string;
}> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as BackupData;

    if (!data || !Array.isArray(data.clients)) {
      return {
        success: false,
        error: 'El archivo seleccionado no tiene el formato de respaldo válido.',
      };
    }

    // Validate client structure
    for (const c of data.clients) {
      if (!c.id || !c.nombre || !c.fechaProximaCita) {
        return {
          success: false,
          error: 'Uno o más registros de clientes en el archivo están incompletos.',
        };
      }
    }

    // Replace clients in Dexie transaction
    await db.transaction('rw', db.clients, async () => {
      await db.clients.clear();
      await db.clients.bulkAdd(data.clients);
    });

    if (data.messageTemplate) {
      await setSetting('messageTemplate', data.messageTemplate);
    }

    // Trigger sync to server
    await syncRemindersToServer();

    return {
      success: true,
      clientCount: data.clients.length,
    };
  } catch (err: any) {
    console.error('Error importing backup:', err);
    return {
      success: false,
      error: 'Error al leer el archivo JSON: ' + (err.message || 'formato inválido'),
    };
  }
}
