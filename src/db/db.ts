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

/**
 * Requests persistent storage from the browser so OS doesn't purge IndexedDB cache.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Checks if persistent storage is already granted.
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}
