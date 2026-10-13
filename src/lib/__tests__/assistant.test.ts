import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db/db';
import type { Client } from '../../types/client';
import { 
  executeTool, 
  processLocalNLP, 
  buildClientsSummary 
} from '../assistantService';

describe('Assistant Service & Local NLP Unit Tests', () => {
  const sampleClients: Client[] = [
    {
      id: 'client-1',
      nombre: 'Valeria Mendoza',
      whatsapp: '51987654321',
      fechaAtencion: '2026-10-10',
      fechaProximaCita: '2026-10-17',
      notas: 'Tratamiento de ansiedad',
      recordado: false,
      createdAt: '2026-10-10T10:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'client-2',
      nombre: 'Carlos Silva',
      whatsapp: '51912345678',
      fechaAtencion: '2026-10-01',
      fechaProximaCita: '2026-10-08',
      notas: 'Revisar tareas',
      recordado: false,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    await db.clients.clear();
    await db.clients.bulkAdd(sampleClients);
  });

  it('buildClientsSummary returns structured string with client names and dates', () => {
    const summary = buildClientsSummary(sampleClients);
    expect(summary).toContain('Valeria Mendoza');
    expect(summary).toContain('Carlos Silva');
    expect(summary).toContain('51987654321');
  });

  it('executeTool: crear_cita creates new client in Dexie with max 500 chars notas', async () => {
    const longNotes = 'A'.repeat(450);
    const result = await executeTool(
      'crear_cita',
      {
        nombre: 'Martín Paredes',
        whatsapp: '998877665',
        fechaAtencion: '2026-10-13',
        fechaProximaCita: '2026-10-20',
        notas: longNotes,
      },
      sampleClients
    );

    expect(result.result?.type).toBe('created');
    expect(result.result?.client?.nombre).toBe('Martín Paredes');
    expect(result.result?.client?.whatsapp).toBe('51998877665');
    expect(result.result?.client?.notas?.length).toBe(450);

    const fromDb = await db.clients.where('nombre').equals('Martín Paredes').first();
    expect(fromDb).toBeDefined();
    expect(fromDb?.notas?.length).toBe(450);
  });

  it('executeTool: reprogramar_cita updates upcoming appointment date', async () => {
    const result = await executeTool(
      'reprogramar_cita',
      {
        nombre: 'Valeria Mendoza',
        nuevaFechaProximaCita: '2026-10-24',
      },
      sampleClients
    );

    expect(result.result?.type).toBe('rescheduled');
    const updated = await db.clients.get('client-1');
    expect(updated?.fechaProximaCita).toBe('2026-10-24');
    expect(updated?.recordado).toBe(false);
  });

  it('executeTool: eliminar_cita deletes client from Dexie', async () => {
    const result = await executeTool(
      'eliminar_cita',
      {
        nombre: 'Carlos Silva',
      },
      sampleClients
    );

    expect(result.result?.type).toBe('deleted');
    const deleted = await db.clients.get('client-2');
    expect(deleted).toBeUndefined();
  });

  it('processLocalNLP parses creation intent in Spanish', async () => {
    const res = await processLocalNLP(
      'Crear cita para Lucía Gómez al 955443322 para mañana',
      sampleClients
    );

    expect(res.actionResult?.type).toBe('created');
    expect(res.actionResult?.client?.nombre).toContain('Lucía');
    expect(res.actionResult?.client?.whatsapp).toBe('51955443322');
  });

  it('processLocalNLP parses reschedule/postpone intent in Spanish', async () => {
    const res = await processLocalNLP(
      'Pospón la cita de Valeria Mendoza por 1 semana',
      sampleClients
    );

    expect(res.actionResult?.type).toBe('rescheduled');
    expect(res.reply).toContain('Valeria Mendoza');
  });

  it('processLocalNLP parses reminder query for pending appointments', async () => {
    const res = await processLocalNLP(
      '¿Cuáles son los recordatorios vencidos o atrasados?',
      sampleClients
    );

    expect(res.actionResult?.type).toBe('list');
    expect(res.actionResult?.clientsList).toBeDefined();
  });
});
