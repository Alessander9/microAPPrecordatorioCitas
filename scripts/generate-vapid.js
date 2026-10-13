import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('====================================================');
console.log('  CLAVES VAPID GENERADAS (Web Push)');
console.log('====================================================\n');
console.log('Copia y pega estas variables en tu archivo .env y en Vercel:\n');
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:tu-correo@ejemplo.com"\n`);
console.log(`VITE_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"\n`);
console.log('====================================================');
