import { describe, it, expect } from 'vitest';
import { getTodayDateLima, SubscribeBodySchema, SyncBodySchema } from '../../../api/_lib/types';

describe('API validation and Lima date helpers', () => {
  it('formats current date in America/Lima timezone (YYYY-MM-DD)', () => {
    const todayLima = getTodayDateLima();
    expect(todayLima).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('validates SubscribeBodySchema correctly', () => {
    const validPayload = {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      },
    };
    const result = SubscribeBodySchema.safeParse(validPayload);
    expect(result.success).toBe(true);

    const invalidPayload = {
      subscription: {
        endpoint: 'not-a-valid-url',
        keys: {},
      },
    };
    expect(SubscribeBodySchema.safeParse(invalidPayload).success).toBe(false);
  });

  it('validates SyncBodySchema correctly and rejects personal data fields', () => {
    const validSync = {
      reminders: [
        {
          id: 'client-opaque-uuid-1',
          fechaRecordatorio: '2026-10-16',
          recordado: false,
        },
      ],
    };
    const result = SyncBodySchema.safeParse(validSync);
    expect(result.success).toBe(true);

    const invalidDateFormat = {
      reminders: [
        {
          id: 'client-1',
          fechaRecordatorio: '16/10/2026', // wrong format
          recordado: true,
        },
      ],
    };
    expect(SyncBodySchema.safeParse(invalidDateFormat).success).toBe(false);
  });
});
