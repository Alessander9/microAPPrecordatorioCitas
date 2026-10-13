import { describe, it, expect } from 'vitest';
import {
  normalizeWhatsAppNumber,
  isValidWhatsAppNumber,
  generateReminderMessage,
  buildWhatsAppUrl,
} from '../whatsapp';

describe('whatsapp utils', () => {
  it('normalizes Peruvian 9-digit numbers with 51 prefix', () => {
    expect(normalizeWhatsAppNumber('987654321')).toBe('51987654321');
    expect(normalizeWhatsAppNumber('+51 987 654 321')).toBe('51987654321');
    expect(normalizeWhatsAppNumber('51-987-654-321')).toBe('51987654321');
  });

  it('validates phone numbers correctly', () => {
    expect(isValidWhatsAppNumber('987654321')).toBe(true);
    expect(isValidWhatsAppNumber('+51987654321')).toBe(true);
    expect(isValidWhatsAppNumber('123')).toBe(false);
    expect(isValidWhatsAppNumber('')).toBe(false);
  });

  it('interpolates template with {nombre} and {fecha}', () => {
    const template = 'Hola {nombre}, tu cita es el {fecha}.';
    const message = generateReminderMessage(template, 'María Flores', '2026-10-16');

    expect(message).toContain('María Flores');
    expect(message.toLowerCase()).toContain('viernes 16 de octubre');
  });

  it('builds valid WhatsApp wa.me URL with encoded message', () => {
    const url = buildWhatsAppUrl('987654321', 'Carlos', '2026-10-16');
    expect(url).toContain('https://wa.me/51987654321?text=');
    expect(url).toContain(encodeURIComponent('Carlos'));
  });
});
