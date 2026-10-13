import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const SubscribeBodySchema = z.object({
  subscription: PushSubscriptionSchema,
});

export const ReminderSyncItemSchema = z.object({
  id: z.string().min(1).max(64),
  fechaRecordatorio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD'),
  recordado: z.boolean(),
});

export const SyncBodySchema = z.object({
  reminders: z.array(ReminderSyncItemSchema).max(1000),
});

/**
 * Gets the current date string in America/Lima timezone (YYYY-MM-DD)
 */
export function getTodayDateLima(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Returns "YYYY-MM-DD"
}
