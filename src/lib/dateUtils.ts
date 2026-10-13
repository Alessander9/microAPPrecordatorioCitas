import { parseISO, format, isToday, isBefore, isAfter, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Client } from '../types/client';

export interface GroupedClients {
  hoy: Client[];
  atrasados: Client[];
  proximos7Dias: Client[];
  resto: Client[];
}

/**
 * Formats a date string (YYYY-MM-DD) into natural Spanish (e.g., "viernes 17 de octubre").
 */
export function formatSpanishDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    // Append T00:00:00 to avoid timezone shift on YYYY-MM-DD
    const date = parseISO(`${dateStr}T00:00:00`);
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date string into a compact format (e.g., "17 oct 2026").
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(`${dateStr}T00:00:00`);
    return format(date, 'd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

/**
 * Groups clients into:
 * - Hoy: próxima cita cae hoy
 * - Atrasados: la fecha ya pasó y NO se marcó como recordado
 * - Próximos 7 días: después de hoy hasta hoy + 7 días
 * - Resto: fechas posteriores a los 7 días (o citas pasadas ya recordadas)
 */
export function groupClientsByReminderDate(clients: Client[], referenceDate = new Date()): GroupedClients {
  const todayStart = startOfDay(referenceDate);
  const next7DaysEnd = startOfDay(addDays(todayStart, 7));

  const result: GroupedClients = {
    hoy: [],
    atrasados: [],
    proximos7Dias: [],
    resto: [],
  };

  for (const client of clients) {
    if (!client.fechaProximaCita) {
      result.resto.push(client);
      continue;
    }

    const clientDate = startOfDay(parseISO(`${client.fechaProximaCita}T00:00:00`));

    if (isToday(clientDate)) {
      result.hoy.push(client);
    } else if (isBefore(clientDate, todayStart)) {
      // Past dates
      if (!client.recordado) {
        result.atrasados.push(client);
      } else {
        result.resto.push(client);
      }
    } else if (isAfter(clientDate, todayStart) && !isAfter(clientDate, next7DaysEnd)) {
      // Within next 7 days
      result.proximos7Dias.push(client);
    } else {
      // Beyond 7 days
      result.resto.push(client);
    }
  }

  // Sort each group by fechaProximaCita ascending
  const sortByDate = (a: Client, b: Client) => a.fechaProximaCita.localeCompare(b.fechaProximaCita);
  result.hoy.sort(sortByDate);
  result.atrasados.sort(sortByDate);
  result.proximos7Dias.sort(sortByDate);
  result.resto.sort(sortByDate);

  return result;
}
