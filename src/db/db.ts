import Dexie, { type Table } from 'dexie';
import type { Client } from '../types/client';
import type { AppSettingRecord } from '../types/settings';

export class RecordatorioDatabase extends Dexie {
  clients!: Table<Client, string>;
  settings!: Table<AppSettingRecord, string>;

  constructor() {
    super('RecordatorioCitasDB');
    this.version(1).stores({
      clients: 'id, nombre, fechaProximaCita, recordado, createdAt',
      settings: 'key'
    });
  }
}

export const db = new RecordatorioDatabase();

// Helper functions for settings table
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  const record = await db.settings.get(key);
  return record ? (record.value as T) : defaultValue;
}

export async function setSetting(key: string, value: any): Promise<void> {
  await db.settings.put({ key, value });
}

export async function removeSetting(key: string): Promise<void> {
  await db.settings.delete(key);
}
