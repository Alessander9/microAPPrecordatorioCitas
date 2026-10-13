import { describe, it, expect } from 'vitest';
import { formatSpanishDate, groupClientsByReminderDate } from '../dateUtils';
import type { Client } from '../../types/client';

describe('dateUtils', () => {
  it('formats Spanish date correctly', () => {
    // 2026-10-16 is a Friday
    const formatted = formatSpanishDate('2026-10-16');
    expect(formatted.toLowerCase()).toContain('viernes');
    expect(formatted.toLowerCase()).toContain('16');
    expect(formatted.toLowerCase()).toContain('octubre');
  });

  it('groups clients correctly into hoy, atrasados, proximos7Dias and resto', () => {
    // Reference date: 2026-10-13
    const refDate = new Date('2026-10-13T12:00:00');

    const sampleClients: Client[] = [
      {
        id: '1',
        nombre: 'Cliente Hoy',
        whatsapp: '51999999999',
        fechaAtencion: '2026-10-06',
        fechaProximaCita: '2026-10-13',
        recordado: false,
        createdAt: '2026-10-06T10:00:00Z',
        updatedAt: '2026-10-06T10:00:00Z',
      },
      {
        id: '2',
        nombre: 'Cliente Atrasado',
        whatsapp: '51988888888',
        fechaAtencion: '2026-10-01',
        fechaProximaCita: '2026-10-10', // Past, not reminded
        recordado: false,
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: '3',
        nombre: 'Cliente Atrasado pero ya recordado',
        whatsapp: '51977777777',
        fechaAtencion: '2026-10-01',
        fechaProximaCita: '2026-10-10',
        recordado: true,
        fechaRecordado: '2026-10-10',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: '4',
        nombre: 'Cliente Próximos 7 días',
        whatsapp: '51966666666',
        fechaAtencion: '2026-10-07',
        fechaProximaCita: '2026-10-16', // 3 days after today
        recordado: false,
        createdAt: '2026-10-07T10:00:00Z',
        updatedAt: '2026-10-07T10:00:00Z',
      },
      {
        id: '5',
        nombre: 'Cliente Futuro Lejano',
        whatsapp: '51955555555',
        fechaAtencion: '2026-10-07',
        fechaProximaCita: '2026-11-20', // Beyond 7 days
        recordado: false,
        createdAt: '2026-10-07T10:00:00Z',
        updatedAt: '2026-10-07T10:00:00Z',
      },
    ];

    const grouped = groupClientsByReminderDate(sampleClients, refDate);

    expect(grouped.hoy).toHaveLength(1);
    expect(grouped.hoy[0].nombre).toBe('Cliente Hoy');

    expect(grouped.atrasados).toHaveLength(1);
    expect(grouped.atrasados[0].nombre).toBe('Cliente Atrasado');

    expect(grouped.proximos7Dias).toHaveLength(1);
    expect(grouped.proximos7Dias[0].nombre).toBe('Cliente Próximos 7 días');

    expect(grouped.resto).toHaveLength(2);
    expect(grouped.resto.map(c => c.nombre)).toContain('Cliente Futuro Lejano');
    expect(grouped.resto.map(c => c.nombre)).toContain('Cliente Atrasado pero ya recordado');
  });
});
