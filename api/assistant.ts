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

interface ProviderConfig {
  name: 'groq' | 'gemini' | 'mistral';
  url: string;
  model: string;
  apiKey: string;
}

function getProviderConfigs(customKeys?: { groq?: string; gemini?: string; mistral?: string }): ProviderConfig[] {
  const groqKey =
    customKeys?.groq ||
    process.env.GROQ_API_KEY ||
    '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';

  const geminiKey =
    customKeys?.gemini ||
    process.env.GEMINI_API_KEY ||
    'AIzaSyDk8G2wac2FQnW6NWgh-X53e0mhQ-h1kYU';

  const mistralKey =
    customKeys?.mistral ||
    process.env.MISTRAL_API_KEY ||
    'mstrl_xIRlWmxsh5R8NKQ0FXkQiW8bRHaxIyal_4qdnDV';

  return [
    {
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'qwen/qwen3.8-27b',
      apiKey: groqKey,
    },
    {
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: 'gemini-2.5-flash',
      apiKey: geminiKey,
    },
    {
      name: 'mistral',
      url: 'https://api.mistral.ai/v1/chat/completions',
      model: 'mistral-small-latest',
      apiKey: mistralKey,
    },
  ];
}

async function callProvider(
  cfg: ProviderConfig,
  messages: any[],
  temperature = 0.1
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature,
        max_tokens: 1000,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${res.status} desde ${cfg.name}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || `Fallo de red en ${cfg.name}` };
  }
}

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
    const { messages, clientsSummary, currentDate, preferredProvider, customKeys } = rawBody;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'messages debe ser un array no vacío.' }));
    }

    const systemPrompt = `Eres el Asistente Clínico Inteligente de la micro web app PWA "Recordatorio de Citas" para un terapeuta en Perú.
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
   - Para ver quién tiene cita o buscar clientes -> invoca 'consultar_citas'.
2. Si el usuario te pide crear una cita y no da teléfono, asigna '51900000000' temporal o pídelo amablemente.
3. Si el usuario no indica fecha de atención, asume la fecha actual de hoy (${currentDate?.split('T')[0] || new Date().toISOString().split('T')[0]}).
4. Si el usuario dice "el próximo lunes", "en una semana", "mañana", calcula la fecha exacta YYYY-MM-DD.
5. El campo notas no debe superar 500 caracteres.
6. Responde de forma cálida, concisa y profesional en español peruano neutro.
7. REGLA ESTRICTA DE IDENTIDAD: NUNCA menciones marcas, nombres de proveedores ni modelos de inteligencia artificial (tales como Groq, Gemini, Google, Mistral, Llama, Qwen, DeepSeek, OpenAI, ChatGPT, etc.). Si te preguntan quién eres o cómo estás programado, identifícate SIEMPRE y ÚNICAMENTE como el "Asistente Inteligente" del consultorio.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const configs = getProviderConfigs(customKeys);

    // Ordenar configs según el proveedor preferido (por defecto: Groq -> Gemini -> Mistral)
    const primaryName = preferredProvider || 'groq';
    const sortedConfigs = [...configs].sort((a, b) => {
      if (a.name === primaryName) return -1;
      if (b.name === primaryName) return 1;
      return 0;
    });

    let lastError = '';
    for (const cfg of sortedConfigs) {
      const result = await callProvider(cfg, fullMessages);
      if (result.success && result.data) {
        const choice = result.data.choices?.[0];
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            success: true,
            provider: cfg.name,
            model: cfg.model,
            message: choice?.message || { role: 'assistant', content: 'Operación procesada.' },
            toolCalls: choice?.message?.tool_calls || [],
          })
        );
      }
      lastError = result.error || `Error en ${cfg.name}`;
      console.warn(`Fallo con proveedor ${cfg.name}:`, lastError);
    }

    // Si todos los proveedores externos fallaron, responder para que el motor local de la PWA tome control
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'all_providers_failed',
        message: 'No se pudo conectar con el servicio en la nube en este momento. Se activará el modo local.',
      })
    );
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'server_error', message: err.message || 'Error interno' }));
  }
}
