import { db, getSetting } from '../db/db';
import type { Client } from '../types/client';
import { normalizeWhatsAppNumber } from './whatsapp';
import { syncRemindersToServer } from './syncService';
import { formatSpanishDate } from './dateUtils';
import { addDays, format, parseISO, isValid } from 'date-fns';

export type AIProvider = 'groq' | 'gemini' | 'mistral' | 'local';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: AIProvider;
  actionResult?: {
    type: 'created' | 'rescheduled' | 'edited' | 'deleted' | 'reminded' | 'list' | 'error';
    client?: Partial<Client>;
    clientsList?: Client[];
    summaryText?: string;
  };
  isLocalFallback?: boolean;
}

export interface AssistantResponse {
  reply: string;
  provider?: AIProvider;
  actionResult?: AssistantMessage['actionResult'];
  isLocalFallback?: boolean;
  error?: string;
}

/**
 * Normaliza nombres para comparación flexible
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca un cliente en la lista por nombre aproximado o ID
 */
function findClientMatch(clients: Client[], identifier?: string): Client | undefined {
  if (!identifier) return undefined;
  // 1. Coincidencia exacta por ID
  const byId = clients.find(c => c.id === identifier);
  if (byId) return byId;

  const target = normalizeText(identifier);
  // 2. Coincidencia exacta de nombre normalizado
  const exactName = clients.find(c => normalizeText(c.nombre) === target);
  if (exactName) return exactName;

  // 3. Subcadena contenida
  const subMatch = clients.find(c => {
    const cNorm = normalizeText(c.nombre);
    return cNorm.includes(target) || target.includes(cNorm);
  });
  return subMatch;
}

/**
 * Genera un resumen compacto de los clientes para alimentar al asistente
 */
export function buildClientsSummary(clients: Client[]): string {
  if (clients.length === 0) return 'Sin clientes registrados.';
  return clients
    .slice(0, 50)
    .map(c => {
      const atencion = c.fechaAtencion || 'No especificada';
      const prox = c.fechaProximaCita;
      const estado = c.recordado ? 'Recordado por WhatsApp' : 'Pendiente de recordatorio';
      const notas = c.notas ? ` [Notas: ${c.notas.slice(0, 60)}]` : '';
      return `- ID: ${c.id} | ${c.nombre} | Tel: ${c.whatsapp} | Atendido: ${atencion} | Próxima cita: ${prox} | Estado: ${estado}${notas}`;
    })
    .join('\n');
}

/**
 * Ejecuta una llamada a herramienta (Tool Call) sobre Dexie IndexedDB
 */
export async function executeTool(
  toolName: string,
  args: any,
  allClients: Client[]
): Promise<{ text: string; result?: AssistantMessage['actionResult'] }> {
  const nowIso = new Date().toISOString();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  switch (toolName) {
    case 'crear_cita': {
      const nombre = (args.nombre || '').trim();
      if (!nombre) {
        return { text: 'No se pudo crear la cita: falta el nombre del cliente.' };
      }

      const whatsapp = args.whatsapp ? normalizeWhatsAppNumber(args.whatsapp) : '51900000000';
      const fechaAtencion = args.fechaAtencion || todayStr;
      const fechaProximaCita = args.fechaProximaCita || format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const notas = (args.notas || '').slice(0, 500).trim();

      const newClient: Client = {
        id: crypto.randomUUID(),
        nombre,
        whatsapp,
        fechaAtencion,
        fechaProximaCita,
        notas,
        recordado: false,
        fechaRecordado: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await db.clients.add(newClient);
      syncRemindersToServer();

      return {
        text: `¡Listo! He registrado la cita para ${nombre} el ${formatSpanishDate(fechaProximaCita)}.`,
        result: {
          type: 'created',
          client: newClient,
          summaryText: `Registrado: ${nombre} (${formatSpanishDate(fechaProximaCita)})`,
        },
      };
    }

    case 'reprogramar_cita': {
      const client = findClientMatch(allClients, args.clienteId || args.nombre);
      if (!client) {
        return { text: `No encontré ningún paciente con el nombre "${args.nombre || args.clienteId}".` };
      }

      let newDate = args.nuevaFechaProximaCita;
      if (!newDate && args.diasASumar) {
        const base = client.fechaProximaCita ? parseISO(client.fechaProximaCita) : new Date();
        newDate = format(addDays(base, Number(args.diasASumar)), 'yyyy-MM-dd');
      }

      if (!newDate || !isValid(parseISO(newDate))) {
        newDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      }

      await db.clients.update(client.id, {
        fechaProximaCita: newDate,
        recordado: false,
        fechaRecordado: null,
        updatedAt: nowIso,
      });
      syncRemindersToServer();

      const updated = { ...client, fechaProximaCita: newDate, recordado: false };
      return {
        text: `Se reprogramó la cita de ${client.nombre} para el ${formatSpanishDate(newDate)}.`,
        result: {
          type: 'rescheduled',
          client: updated,
          summaryText: `Reprogramado: ${client.nombre} -> ${formatSpanishDate(newDate)}`,
        },
      };
    }

    case 'editar_cita': {
      const client = findClientMatch(allClients, args.clienteId || args.nombre);
      if (!client) {
        return { text: `No se encontró a "${args.nombre || args.clienteId}" para editar.` };
      }

      const updates: Partial<Client> = { updatedAt: nowIso };
      if (args.nuevoNombre) updates.nombre = args.nuevoNombre.trim();
      if (args.nuevoWhatsapp) updates.whatsapp = normalizeWhatsAppNumber(args.nuevoWhatsapp);
      if (args.nuevaFechaAtencion) updates.fechaAtencion = args.nuevaFechaAtencion;
      if (args.nuevaFechaProximaCita) {
        updates.fechaProximaCita = args.nuevaFechaProximaCita;
        updates.recordado = false;
        updates.fechaRecordado = null;
      }
      if (args.nuevasNotas !== undefined) updates.notas = String(args.nuevasNotas).slice(0, 500).trim();

      await db.clients.update(client.id, updates);
      syncRemindersToServer();

      const updated = { ...client, ...updates };
      return {
        text: `He actualizado los datos de ${updated.nombre || client.nombre}.`,
        result: {
          type: 'edited',
          client: updated,
          summaryText: `Datos actualizados para ${updated.nombre || client.nombre}`,
        },
      };
    }

    case 'eliminar_cita': {
      const client = findClientMatch(allClients, args.clienteId || args.nombre);
      if (!client) {
        return { text: `No encontré el cliente "${args.nombre || args.clienteId}" para eliminar.` };
      }

      await db.clients.delete(client.id);
      syncRemindersToServer();

      return {
        text: `Se eliminó el registro de ${client.nombre} correctamente.`,
        result: {
          type: 'deleted',
          client,
          summaryText: `Eliminado: ${client.nombre}`,
        },
      };
    }

    case 'marcar_recordado': {
      const client = findClientMatch(allClients, args.clienteId || args.nombre);
      if (!client) {
        return { text: `No encontré a "${args.nombre || args.clienteId}".` };
      }

      const state = args.recordado !== undefined ? Boolean(args.recordado) : true;
      await db.clients.update(client.id, {
        recordado: state,
        fechaRecordado: state ? nowIso : null,
        updatedAt: nowIso,
      });
      syncRemindersToServer();

      const updated = { ...client, recordado: state };
      return {
        text: state
          ? `Marcado como recordado para ${client.nombre}.`
          : `Se marcó como pendiente de recordatorio a ${client.nombre}.`,
        result: {
          type: 'reminded',
          client: updated,
          summaryText: `${client.nombre}: ${state ? 'Recordado' : 'Pendiente'}`,
        },
      };
    }

    case 'consultar_citas': {
      const filtro = args.filtro || 'todas';
      let list = [...allClients];

      if (filtro === 'hoy') {
        list = list.filter(c => c.fechaProximaCita === todayStr);
      } else if (filtro === 'vencidas') {
        list = list.filter(c => c.fechaProximaCita < todayStr && !c.recordado);
      } else if (filtro === 'proximas') {
        list = list.filter(c => c.fechaProximaCita > todayStr);
      }

      if (args.busqueda) {
        const q = normalizeText(args.busqueda);
        list = list.filter(c => normalizeText(c.nombre).includes(q));
      }

      const count = list.length;
      return {
        text: count > 0
          ? `Encontré ${count} cita(s) con el criterio "${filtro}":\n` +
            list.map(c => `• ${c.nombre} (${formatSpanishDate(c.fechaProximaCita)})`).join('\n')
          : `No hay citas registradas para el criterio "${filtro}".`,
        result: {
          type: 'list',
          clientsList: list,
          summaryText: `Consulta: ${count} pacientes`,
        },
      };
    }

    default:
      return { text: `Herramienta desconocida: ${toolName}` };
  }
}

/**
 * Parser Inteligente Local de Respaldo (Offline & Resiliente a errores de API)
 */
export async function processLocalNLP(userInput: string, allClients: Client[]): Promise<AssistantResponse> {
  const norm = normalizeText(userInput);
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // 1. CONSULTAS: "¿Quién tiene cita hoy?", "Citas de hoy", "Pendientes"
  if (norm.includes('hoy') && (norm.includes('cita') || norm.includes('quien') || norm.includes('escribir') || norm.includes('tengo'))) {
    const matching = allClients.filter(c => c.fechaProximaCita === todayStr);
    return {
      reply: matching.length > 0
        ? `Tienes ${matching.length} cita(s) programadas para hoy:\n` +
          matching.map(c => `• ${c.nombre} (${c.recordado ? '✅ Ya recordado' : '🔔 Pendiente WhatsApp'})`).join('\n')
        : 'No tienes citas programadas para hoy.',
      actionResult: { type: 'list', clientsList: matching },
      isLocalFallback: true,
    };
  }

  if (norm.includes('atrasad') || norm.includes('vencid') || norm.includes('pendiente')) {
    const matching = allClients.filter(c => c.fechaProximaCita <= todayStr && !c.recordado);
    return {
      reply: matching.length > 0
        ? `Tienes ${matching.length} recordatorio(s) pendientes o vencidos:\n` +
          matching.map(c => `• ${c.nombre} (Fecha: ${formatSpanishDate(c.fechaProximaCita)})`).join('\n')
        : '¡Excelente! No tienes recordatorios vencidos pendientes.',
      actionResult: { type: 'list', clientsList: matching },
      isLocalFallback: true,
    };
  }

  // 2. ELIMINAR CITA
  if (norm.startsWith('eliminar') || norm.startsWith('borrar') || norm.includes('eliminar cita') || norm.includes('borrar cita')) {
    // Buscar qué cliente coincide
    const matched = allClients.find(c => norm.includes(normalizeText(c.nombre)));
    if (matched) {
      await db.clients.delete(matched.id);
      syncRemindersToServer();
      return {
        reply: `He eliminado el registro de ${matched.nombre}.`,
        actionResult: { type: 'deleted', client: matched },
        isLocalFallback: true,
      };
    }
    return {
      reply: 'Por favor indica el nombre exacto del paciente que deseas eliminar.',
      isLocalFallback: true,
    };
  }

  // 3. REPROGRAMAR / POSPONER CITA
  if (norm.includes('pospon') || norm.includes('reprogram') || norm.includes('cambiar cita') || norm.includes('mover cita')) {
    const matched = allClients.find(c => norm.includes(normalizeText(c.nombre)));
    if (matched) {
      let days = 7; // Default 1 week
      if (norm.includes('1 semana') || norm.includes('una semana') || norm.includes('7 dias')) days = 7;
      else if (norm.includes('2 semana') || norm.includes('dos semanas') || norm.includes('14 dias')) days = 14;
      else if (norm.includes('3 semana') || norm.includes('tres semanas') || norm.includes('21 dias')) days = 21;
      else if (norm.includes('1 mes') || norm.includes('un mes') || norm.includes('28 dias') || norm.includes('30 dias')) days = 28;
      else {
        const numMatch = norm.match(/(\d+)\s*dias/);
        if (numMatch) days = parseInt(numMatch[1], 10);
      }

      const base = matched.fechaProximaCita ? parseISO(matched.fechaProximaCita) : today;
      const newDate = format(addDays(base, days), 'yyyy-MM-dd');

      await db.clients.update(matched.id, {
        fechaProximaCita: newDate,
        recordado: false,
        fechaRecordado: null,
        updatedAt: new Date().toISOString(),
      });
      syncRemindersToServer();

      return {
        reply: `He pospuesto la cita de ${matched.nombre} por ${days} días (nueva fecha: ${formatSpanishDate(newDate)}).`,
        actionResult: {
          type: 'rescheduled',
          client: { ...matched, fechaProximaCita: newDate },
        },
        isLocalFallback: true,
      };
    }
  }

  // 4. MARCAR RECORDADO
  if (norm.includes('recordado') || norm.includes('ya le escribi') || norm.includes('ya escribi')) {
    const matched = allClients.find(c => norm.includes(normalizeText(c.nombre)));
    if (matched) {
      const nowIso = new Date().toISOString();
      await db.clients.update(matched.id, {
        recordado: true,
        fechaRecordado: nowIso,
        updatedAt: nowIso,
      });
      syncRemindersToServer();
      return {
        reply: `He marcado a ${matched.nombre} como ya recordado por WhatsApp.`,
        actionResult: { type: 'reminded', client: { ...matched, recordado: true } },
        isLocalFallback: true,
      };
    }
  }

  // 5. CREAR CITA
  if (norm.includes('crear') || norm.includes('agendar') || norm.includes('nueva cita') || norm.includes('registrar')) {
    // Intentar extraer teléfono (9 dígitos peruanos)
    const phoneMatch = userInput.match(/(?:(?:\+?51)?\s*)?([9]\d{8})/);
    const whatsapp = phoneMatch ? normalizeWhatsAppNumber(phoneMatch[1]) : '51900000000';

    // Intentar extraer nombre (palabras tras "para" o "a")
    let nombre = '';
    const nameMatch = userInput.match(/(?:para|a|de)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){1,3})/i);
    if (nameMatch) {
      nombre = nameMatch[1].trim();
    } else {
      // Fallback
      nombre = 'Nuevo Paciente';
    }

    // Calcular fecha
    let daysOffset = 7;
    if (norm.includes('mañana')) daysOffset = 1;
    else if (norm.includes('pasado mañana')) daysOffset = 2;
    else if (norm.includes('2 semana') || norm.includes('14 dias')) daysOffset = 14;
    else if (norm.includes('1 mes') || norm.includes('un mes')) daysOffset = 28;

    const fechaProximaCita = format(addDays(today, daysOffset), 'yyyy-MM-dd');
    const newClient: Client = {
      id: crypto.randomUUID(),
      nombre,
      whatsapp,
      fechaAtencion: todayStr,
      fechaProximaCita,
      notas: '',
      recordado: false,
      fechaRecordado: null,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    };

    await db.clients.add(newClient);
    syncRemindersToServer();

    return {
      reply: `He registrado la cita de ${nombre} para el ${formatSpanishDate(fechaProximaCita)}.`,
      actionResult: { type: 'created', client: newClient },
      isLocalFallback: true,
    };
  }

  // 6. Mensaje por defecto de ayuda
  return {
    reply: `Entendido. Puedes pedirme cosas como:\n` +
      `• "Crea una cita para Carlos Pérez al 987654321 el próximo martes"\n` +
      `• "Pospón la cita de María por 1 semana"\n` +
      `• "Elimina la cita de Juan"\n` +
      `• "¿Quién tiene cita hoy?"`,
    isLocalFallback: true,
  };
}

/**
 * Función principal: Envía la consulta a la IA (Groq por defecto, Gemini o Mistral de respaldo) vía /api/assistant.
 * Si todos fallan o el dispositivo está desconectado, recurre automáticamente al motor local.
 */
export async function sendAssistantMessage(
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  allClients: Client[],
  preferredProvider?: 'groq' | 'gemini' | 'mistral',
  customKeys?: { groq?: string; gemini?: string; mistral?: string }
): Promise<AssistantResponse> {
  const latestUserPrompt = conversationHistory[conversationHistory.length - 1]?.content || '';
  const clientsSummary = buildClientsSummary(allClients);
  const nowIso = new Date().toISOString();

  // Obtener proveedor y claves guardadas en ajustes si no se pasaron explícitamente
  const effectiveProvider = preferredProvider || (await getSetting<'groq' | 'gemini' | 'mistral'>('aiProvider', 'groq'));
  const storedGroq = await getSetting<string>('groqApiKey', '');
  const storedGemini = await getSetting<string>('geminiApiKey', '');
  const storedMistral = await getSetting<string>('mistralApiKey', '');

  const effectiveKeys = {
    groq: customKeys?.groq || storedGroq || undefined,
    gemini: customKeys?.gemini || storedGemini || undefined,
    mistral: customKeys?.mistral || storedMistral || undefined,
  };

  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        clientsSummary,
        currentDate: nowIso,
        preferredProvider: effectiveProvider,
        customKeys: effectiveKeys,
      }),
    });

    const data = await res.json();

    // Caso de error en proveedores externos (activar motor local)
    if (!res.ok || data.error) {
      console.warn('Proveedores IA retornaron error o límite, activando motor local:', data);
      const localResult = await processLocalNLP(latestUserPrompt, allClients);

      return {
        reply: localResult.reply + `\n\n*(Procesado con motor local inteligente)*`,
        provider: 'local',
        actionResult: localResult.actionResult,
        isLocalFallback: true,
        error: data.error,
      };
    }

    const providerUsed: AIProvider = data.provider || effectiveProvider || 'groq';

    // Si la IA respondió con Tool Calls (ej: crear_cita, reprogramar_cita, etc.)
    if (data.toolCalls && data.toolCalls.length > 0) {
      let combinedReply = data.message?.content ? `${data.message.content}\n\n` : '';
      let lastActionResult: AssistantMessage['actionResult'] = undefined;

      for (const tc of data.toolCalls) {
        try {
          const fnArgs = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
          const execution = await executeTool(tc.function.name, fnArgs, allClients);
          combinedReply += execution.text + '\n';
          if (execution.result) lastActionResult = execution.result;
        } catch (err: any) {
          combinedReply += `Error al procesar acción: ${err.message}\n`;
        }
      }

      return {
        reply: combinedReply.trim(),
        provider: providerUsed,
        actionResult: lastActionResult,
        isLocalFallback: false,
      };
    }

    // Respuesta conversacional directa
    return {
      reply: data.message?.content || 'Operación procesada.',
      provider: providerUsed,
      isLocalFallback: false,
    };
  } catch (err: any) {
    console.warn('Fallo de red al llamar /api/assistant, ejecutando localmente:', err);
    const localResult = await processLocalNLP(latestUserPrompt, allClients);
    return {
      reply: localResult.reply + '\n\n*(Ejecutado en modo sin conexión / local)*',
      provider: 'local',
      actionResult: localResult.actionResult,
      isLocalFallback: true,
    };
  }
}
