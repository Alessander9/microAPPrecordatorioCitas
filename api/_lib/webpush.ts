import webpush from 'web-push';

let isConfigured = false;

export function configureWebPush(): typeof webpush {
  if (isConfigured) {
    return webpush;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:terapeuta@ejemplo.com';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY deben estar configuradas en las variables de entorno.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;

  return webpush;
}
