import { formatSpanishDate } from './dateUtils';
import { DEFAULT_MESSAGE_TEMPLATE, DEFAULT_THERAPIST_NAME } from '../types/settings';

/**
 * Normalizes phone number to international format without plus or symbols.
 * Defaults to Peru (+51) if a 9-digit local mobile number is provided.
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  // Remove all non-digit characters
  const digits = rawPhone.replace(/\D/g, '');

  // If 9 digits starting with 9 (Peruvian cell format), prepend 51
  if (digits.length === 9 && digits.startsWith('9')) {
    return `51${digits}`;
  }

  return digits;
}

/**
 * Validates whether the phone number is valid for WhatsApp.
 * Supports Peruvian 9-digit numbers (or 11-digit with country code 51) or standard international (7 to 15 digits).
 */
export function isValidWhatsAppNumber(rawPhone: string): boolean {
  const normalized = normalizeWhatsAppNumber(rawPhone);
  // International E.164 without plus: between 8 and 15 digits
  return /^[1-9]\d{7,14}$/.test(normalized);
}

/**
 * Generates the personalized reminder message replacing {nombre}, {fecha} and {terapeuta}.
 */
export function generateReminderMessage(
  template: string = DEFAULT_MESSAGE_TEMPLATE,
  clientName: string,
  appointmentDateStr: string,
  therapistName?: string
): string {
  const formattedDate = formatSpanishDate(appointmentDateStr);
  const signature = (therapistName && therapistName.trim()) || DEFAULT_THERAPIST_NAME;
  return template
    .replace(/{nombre}/gi, clientName.trim())
    .replace(/{fecha}/gi, formattedDate)
    .replace(/{terapeuta}/gi, signature);
}

/**
 * Builds the wa.me link with encoded text.
 */
export function buildWhatsAppUrl(
  phone: string,
  clientName: string,
  appointmentDateStr: string,
  template: string = DEFAULT_MESSAGE_TEMPLATE,
  therapistName?: string
): string {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  const message = generateReminderMessage(template, clientName, appointmentDateStr, therapistName);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}
