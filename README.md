# Recordatorio de Citas 🌿 (Micro Web App PWA)

Micro aplicación web progresiva (PWA) móvil diseñada especialmente para terapeutas y profesionales de la salud mental. Permite gestionar pacientes, agendar la próxima cita y recordar a quién escribirle por WhatsApp con un solo toque, incluyendo notificaciones push matutinas automáticas.

Desplegable al 100% en **Vercel** de forma gratuita, con arquitectura **Privacy-by-Design** donde los datos personales de los clientes **jamás abandonan el dispositivo**.

---

## 🚀 Características Principales

1. **Privacidad por Diseño (Privacy by Design):**
   - Los nombres, números de WhatsApp y notas clínicas de los pacientes se guardan **únicamente en la base de datos local del navegador (IndexedDB con Dexie.js)** del terapeuta.
   - La sincronización al servidor solo envía identificadores anónimos opacos y fechas (`{ id, fechaRecordatorio, recordado }`), cumpliendo con la **Ley de Protección de Datos Personales del Perú (Ley N° 29733)**.
2. **Acceso Seguro con PIN:**
   - Creación de PIN de 4 a 6 dígitos en el primer uso.
   - Cifrado mediante **PBKDF2 con Web Crypto API** (100,000 iteraciones, salt aleatorio criptográfico). El PIN nunca se guarda en texto claro.
   - Bloqueo temporal progresivo tras 5 intentos fallidos (30 segundos).
   - Bloqueo automático tras 2 minutos de inactividad o al regresar de segundo plano (cambio de pestaña/app).
   - La sesión desbloqueada vive estrictamente en la memoria RAM del navegador (no en `localStorage`).
3. **Gestión de Clientes y Citas:**
   - Registro de Nombre, WhatsApp (por defecto código +51 de Perú, con validación), Fecha de atención, Fecha de próxima sesión y Notas breves (máx. 140 caracteres).
   - Búsqueda en tiempo real por nombre de cliente.
   - Acción rápida **"Reagendar"** con atajos (+1 semana, +2 semanas, +1 mes).
4. **Pantalla "Mis Recordatorios" (Agrupación Inteligente):**
   - **Hoy:** Clientes cuya cita o recordatorio es hoy.
   - **Atrasados:** Citas pasadas pendientes de recordar.
   - **Próximos 7 días:** Citas dentro de la semana entrante.
   - **Resto:** Fechas posteriores o citas ya atendidas.
5. **Integración con WhatsApp:**
   - Abre `https://wa.me/<numero>?text=<mensaje>` con mensaje preconfigurado y codificado.
   - Plantilla personalizable en Ajustes con variables `{nombre}` y `{fecha}` (en español natural, ej. *"viernes 17 de octubre"*).
   - Tras tocar el botón, ofrece marcar al paciente como recordado con un solo toque.
6. **Notificaciones Push y Vercel Cron:**
   - Notificación matutina diaria a las **8:00 a.m. hora de Lima (UTC-5 / 13:00 UTC)**.
   - Envío de alerta agregada genérica: *"Tienes N recordatorio(s) para hoy"*.
   - Soporte para la **Badging API** (globo con número de pendientes en el ícono de la app).
   - Limpieza automática de suscripciones caducadas (códigos HTTP 404/410).
7. **PWA Instalable:**
   - Modo pantalla completa (*standalone*).
   - Funciona sin conexión mediante Service Worker con caché de aplicación (*Workbox*).
   - Botón amigable para instalar en la pantalla de inicio del teléfono.
8. **Respaldo de Datos:**
   - Exportación de la base de datos a un archivo JSON descargable.
   - Importación de respaldos con validación de integridad y reemplazo seguro.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (Paleta Azul Marino `#0B1F3A` y Dorado `#C9A24B`).
- **Base de Datos Local:** Dexie.js (IndexedDB).
- **PWA:** `vite-plugin-pwa` con estrategia `injectManifest` y Workbox.
- **Fechas:** `date-fns` con localización en español (`es`).
- **Backend Serverless:** Vercel Functions (`/api`, TypeScript).
- **Base de Datos en Servidor:** Upstash Redis (Vercel Marketplace) para almacenar suscripciones push y recordatorios anónimos.
- **Notificaciones Web Push:** Librería `web-push` con protocolo VAPID.
- **Automatización:** Vercel Cron Jobs.

---

## 📋 Variables de Entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

| Variable | Descripción | Dónde se usa |
| :--- | :--- | :--- |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID para Web Push | Vercel (Backend) |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID para firmar notificaciones | Vercel (Backend) |
| `VAPID_SUBJECT` | Correo de contacto VAPID (`mailto:tu-correo@ejemplo.com`) | Vercel (Backend) |
| `VITE_VAPID_PUBLIC_KEY` | Misma clave pública VAPID accesible al navegador | Frontend (Vite) |
| `UPSTASH_REDIS_REST_URL` | URL REST de tu base de datos Upstash Redis | Vercel / Local |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash Redis | Vercel / Local |
| `CRON_SECRET` | Token secreto para proteger el endpoint `/api/cron/send` | Vercel / Local |

---

## 🔑 1. Cómo Generar las Claves VAPID

El proyecto incluye un comando para generar tus claves VAPID en un segundo:

```bash
npm run vapid
```

O utilizando directamente la herramienta `web-push`:

```bash
npx web-push generate-vapid-keys
```

Esto generará la clave pública y privada. Cópialas tanto en tu `.env` local como en el panel de Vercel.

---

## 🗄️ 2. Cómo Crear Upstash Redis desde Vercel Marketplace

1. Ve a tu proyecto en el panel de [Vercel](https://vercel.com).
2. Haz clic en la pestaña **Storage** (Almacenamiento).
3. Selecciona **Create Database** y elige **Upstash Redis** (o busca "Upstash Redis" en el Marketplace de Vercel).
4. Elige un nombre para tu base (ej. `recordatorio-citas-db`) y la región más cercana (ej. `us-east-1`).
5. Haz clic en **Create**.
6. Al crearse, Vercel conectará automáticamente las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (o `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`) a tu entorno de despliegue.

---

## 💻 3. Configuración y Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Generar claves VAPID y configurar `.env`:**
   ```bash
   npm run vapid
   ```
   Copia los valores en `.env`.

3. **Ejecutar pruebas unitarias:**
   ```bash
   npm run test
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## ☁️ 4. Despliegue Paso a Paso en Vercel

1. **Sube el código a tu repositorio de GitHub o GitLab:**
   ```bash
   git add .
   git commit -m "feat: micro app recordatorio de citas PWA"
   git remote add origin <tu-repositorio-url>
   git push -u origin main
   ```

2. **Importa el proyecto en Vercel:**
   - En tu panel de Vercel, pulsa **Add New... &rarr; Project**.
   - Selecciona tu repositorio.
   - Framework Preset: **Vite**.

3. **Configura las Variables de Entorno en Vercel:**
   - En **Environment Variables**, añade:
     - `VAPID_PUBLIC_KEY`
     - `VAPID_PRIVATE_KEY`
     - `VAPID_SUBJECT`
     - `VITE_VAPID_PUBLIC_KEY`
     - `CRON_SECRET` (ej. una cadena aleatoria de 32 caracteres generada con `openssl rand -hex 32`)
   - Las variables de Upstash Redis se agregarán solas al vincular el almacenamiento desde la pestaña **Storage**.

4. **Despliega la aplicación:**
   - Haz clic en **Deploy**.
   - Vercel compilará la aplicación y desplegará tanto la PWA estática como las Vercel Functions en `/api`.

---

## ⏰ 5. Cron Job Diario (8:00 a.m. Hora de Lima)

El archivo `vercel.json` ya tiene configurado el cron automático:

```json
{
  "crons": [
    {
      "path": "/api/cron/send",
      "schedule": "0 13 * * *"
    }
  ]
}
```

> 📌 **Nota sobre el Plan Hobby de Vercel:**  
> En el plan gratuito (Hobby) de Vercel, los Cron Jobs tienen precisión horaria y están limitados a una ejecución por día. La expresión `0 13 * * *` se ejecuta a las **13:00 UTC**, que corresponde exactamente a las **8:00 a.m. hora de Lima, Perú (UTC-5)**.

---

## 🧪 6. Cómo Probar las Notificaciones Push

### A. Prueba Inmediata desde la Interfaz de la App (Recomendado)
1. Abre la aplicación en tu celular o navegador.
2. Ingresa con tu PIN y ve a la pestaña **Ajustes**.
3. En la sección *Recordatorio diario automático*, presiona **"Activar notificaciones"** y acepta los permisos del navegador.
4. Una vez activadas, aparecerá el botón **"Probar notificación"**. Tócalo y recibirás una alerta push de confirmación al instante.

### B. Prueba Manual del Cron Job
Para simular la ejecución que Vercel realiza a las 8:00 a.m., ejecuta el script incluido:

```bash
# Probando contra el servidor de producción:
node scripts/trigger-cron.js https://tu-app.vercel.app TU_CRON_SECRET
```

O vía `curl`:

```bash
curl -X GET "https://tu-app.vercel.app/api/cron/send" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

El servidor responderá con un JSON resumiendo los dispositivos evaluados y las notificaciones enviadas:
```json
{
  "success": true,
  "dateLima": "2026-10-13",
  "devicesFound": 1,
  "notificationsSent": 1,
  "prunedSubscriptions": 0
}
```

---

## 📱 Nota Especial para Dispositivos iOS (iPhone / iPad)

En dispositivos Apple con iOS 16.4 o superior, las notificaciones Web Push están soportadas únicamente si la aplicación se añade a la pantalla de inicio:
1. Abre la app en **Safari**.
2. Presiona el botón **Compartir** (icono de cuadrado con flecha hacia arriba).
3. Selecciona **"Agregar al inicio"** (Add to Home Screen).
4. Abre la app desde el nuevo icono en tu pantalla de inicio, ingresa a Ajustes y presiona **"Activar notificaciones"**.

---

## 🛡️ Seguridad y Privacidad

- **Sin analíticas ni rastreadores:** Ningún script de terceros incluido.
- **Cabeceras HTTP de seguridad:** Incluye `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy`.
- **Validación con Zod:** Todos los endpoints serverless validan de forma estricta los esquemas de entrada.
- **Ley N° 29733 (Perú):** Recomendamos al profesional terapeuta informar a sus pacientes y contar con su consentimiento para el registro de su número y el envío de recordatorios de sesiones.
