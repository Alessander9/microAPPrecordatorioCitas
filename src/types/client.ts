export interface Client {
  id: string; // UUID v4
  nombre: string;
  whatsapp: string; // formato internacional e.g. 51987654321
  fechaAtencion: string; // YYYY-MM-DD
  fechaProximaCita: string; // YYYY-MM-DD
  recordado: boolean;
  fechaRecordado?: string | null; // ISO string o YYYY-MM-DD cuando se marcó
  notas?: string; // Máx 140 caracteres
  createdAt: string;
  updatedAt: string;
}

export type ClientFormData = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'recordado' | 'fechaRecordado'>;

export interface ReminderSyncItem {
  id: string; // Id opaco
  fechaRecordatorio: string; // YYYY-MM-DD (fechaProximaCita)
  recordado: boolean;
}
