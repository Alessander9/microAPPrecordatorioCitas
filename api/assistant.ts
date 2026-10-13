import type { IncomingMessage, ServerResponse } from 'http';

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 512) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON malformado'));
      }
    });
    req.on('error', reject);
  });
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'crear_cita',
      description: 'Crea un nuevo cliente con su fecha de atención y fecha de recordatorio/próxima cita.',
      parameters: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            description: 'Nombre completo del paciente o cliente.',
          },
          whatsapp: {
            type: 'string',
            description: 'Número de WhatsApp. Ej: 987654321 o 51987654321.',
          },
          fechaAtencion: {
            type: 'string',
            description: 'Fecha en que se atendió la última sesión en formato YYYY-MM-DD. Si no se especifica, usar la fecha de hoy.',
          },
          fechaProximaCita: {
            type: 'string',
            description: 'Fecha calculada para la próxima sesión/recordatorio en formato YYYY-MM-DD.',
          },
          notas: {
            type: 'string',
            description: 'Notas clínicas opcionales, temas a tratar (máximo 500 caracteres).',
          },
        },
        required: ['nombre', 'fechaProximaCita'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reprogramar_cita',
      description: 'Pospone o reprograma la fecha de la próxima cita de un cliente existente.',
      parameters: {
        type: 'object',
        properties: {
          clienteId: {
            type: 'string',
            description: 'ID único del cliente si se conoce.',
          },
          nombre: {
            type: 'string',
            description: 'Nombre del cliente a buscar si no se tiene el ID.',
          },
          nuevaFechaProximaCita: {
            type: 'string',
            description: 'Nueva fecha de la cita en formato YYYY-MM-DD.',
          },
          diasASumar: {
            type: 'number',
            description: 'Días a sumar a la fecha actual de la cita (ej. 7 para una semana).',
          },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'editar_cita',
      description: 'Modifica datos de un cliente (nombre, teléfono, fecha de atención, fecha próxima cita o notas).',
      parameters: {
        type: 'object',
        properties: {
          clienteId: {
            type: 'string',
            description: 'ID único del cliente si se conoce.',
          },
          nombre: {
            type: 'string',
            description: 'Nombre del cliente a buscar.',
          },
          nuevoNombre: {
            type: 'string',
            description: 'Nuevo nombre si se desea cambiar.',
          },
          nuevoWhatsapp: {
            type: 'string',
            description: 'Nuevo número de WhatsApp.',
          },
          nuevaFechaAtencion: {
            type: 'string',
            description: 'Nueva fecha de atención en YYYY-MM-DD.',
          },
          nuevaFechaProximaCita: {
            type: 'string',
            description: 'Nueva fecha de próxima cita en YYYY-MM-DD.',
          },
          nuevasNotas: {
            type: 'string',
            description: 'Nuevas notas clínicas (máximo 500 caracteres).',
          },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'eliminar_cita',
      description: 'Elimina el registro de un cliente y sus recordatorios.',
      parameters: {
        type: 'object',
        properties: {
          clienteId: {
            type: 'string',
            description: 'ID único del cliente.',
          },
          nombre: {
            type: 'string',
            description: 'Nombre del cliente a eliminar.',
          },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marcar_recordado',
      description: 'Marca una cita como ya recordada o pendiente de recordar.',
      parameters: {
        type: 'object',
        properties: {
          clienteId: {
            type: 'string',
            description: 'ID único del cliente.',
          },
          nombre: {
            type: 'string',
            description: 'Nombre del cliente.',
          },
          recordado: {
            type: 'boolean',
            description: 'True si ya se le escribió por WhatsApp, false si queda pendiente.',
          },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_citas',
      description: 'Filtra o consulta citas por estado (hoy, vencidas, proximas, todas).',
      parameters: {
        type: 'object',
        properties: {
          filtro: {
            type: 'string',
            enum: ['hoy', 'vencidas', 'proximas', 'todas'],
            description: 'Criterio de filtro temporal.',
          },
          busqueda: {
            type: 'string',
            description: 'Texto de búsqueda por nombre de paciente.',
          },
        },
        required: ['filtro'],
      },
    },
  },
];

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. Usa POST.' }));
  }

  try {
    const rawBody = req.body || (await parseJsonBody(req));
    const { messages, clientsSummary, currentDate, customApiKey } = rawBody;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'messages debe ser un array no vacío.' }));
    }

    const apiKey =
      customApiKey ||
      process.env.DEEPSEEK_API_KEY ||
      'sk-4ccc4c2a20ff42ff98a2440bf9c8878d';

    const systemPrompt = `Eres el Asistente Inteligente del terapeuta para la micro web app PWA "Recordatorio de Citas" en Perú.
Tu función es ayudar al terapeuta a registrar, posponer, editar, eliminar o consultar recordatorios y sesiones de sus clientes mediante lenguaje natural.
Fecha y hora de referencia: ${currentDate || new Date().toISOString()} (Zona horaria Lima, Perú GMT-5).

Base de clientes actualmente registrados en el dispositivo del terapeuta:
${clientsSummary || '(No hay clientes registrados en este momento)'}

INSTRUCCIONES CLAVE:
1. SIEMPRE utiliza las herramientas (tools) adecuadas para realizar acciones sobre los clientes:
   - Para agendar o crear citas -> invoca 'crear_cita'.
   - Para posponer o cambiar la fecha -> invoca 'reprogramar_cita'.
   - Para cambiar teléfono, notas o datos -> invoca 'editar_cita'.
   - Para borrar o cancelar definitivamente -> invoca 'eliminar_cita'.
   - Para registrar que ya se le escribió por WhatsApp -> invoca 'marcar_recordado'.
2. Si el usuario te pide crear una cita y no da teléfono, asigna '51900000000' temporal o déjalo vacío y pídeselo amablemente.
3. Si el usuario no indica fecha de atención, asume la fecha actual de hoy (${currentDate?.split('T')[0] || new Date().toISOString().split('T')[0]}).
4. Si el usuario dice "el próximo lunes", "en una semana", "mañana", calcula la fecha exacta YYYY-MM-DD.
5. El campo notas no debe superar 500 caracteres.
6. Responde de forma cálida, concisa y profesional en español peruano neutro.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: fullMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    const data = await deepseekRes.json();

    if (!deepseekRes.ok || data.error) {
      const errorMsg = data.error?.message || 'Error desconocido de DeepSeek API';
      const isBalanceError =
        errorMsg.toLowerCase().includes('balance') ||
        data.error?.code === 'insufficient_balance';

      res.statusCode = deepseekRes.status >= 400 && deepseekRes.status < 500 ? deepseekRes.status : 502;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          error: isBalanceError ? 'insufficient_balance' : 'deepseek_error',
          message: errorMsg,
          rawError: data.error,
        })
      );
    }

    const choice = data.choices?.[0];
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        success: true,
        message: choice?.message || { role: 'assistant', content: 'Operación procesada.' },
        toolCalls: choice?.message?.tool_calls || [],
      })
    );
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'server_error', message: err.message || 'Error interno' }));
  }
}
