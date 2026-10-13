/**
 * Script de prueba manual para disparar el Cron Job de envío de recordatorios.
 * Uso:
 *   node scripts/trigger-cron.js [URL_BASE] [CRON_SECRET]
 * Ejemplo local:
 *   node scripts/trigger-cron.js http://localhost:3000 mi_secreto
 */

const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
const cronSecret = process.argv[3] || process.env.CRON_SECRET || 'tu_cron_secret_seguro_aqui';

async function main() {
  const url = `${baseUrl.replace(/\/$/, '')}/api/cron/send`;
  console.log(`Disparando Cron Job en: ${url}`);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const data = await res.json().catch(() => null);
    console.log(`Estado HTTP: ${res.status} ${res.statusText}`);
    console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error al conectar con el servidor:', err.message);
    process.exit(1);
  }
}

main();
