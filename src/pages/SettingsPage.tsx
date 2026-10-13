import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, isStoragePersisted, requestPersistentStorage } from '../db/db';
import { DEFAULT_MESSAGE_TEMPLATE, DEFAULT_THERAPIST_NAME, MESSAGE_PRESETS } from '../types/settings';
import { exportBackup, importBackup } from '../lib/backup';
import { 
  getPushSubscriptionState, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications 
} from '../lib/pushSubscription';
import { getOrCreateDeviceCredentials } from '../lib/syncService';
import { 
  KeyRound, 
  MessageSquare, 
  Bell, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  Monitor, 
  ShieldCheck, 
  AlertTriangle, 
  Send,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { changePin } = useAuth();

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [template, setTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [therapistName, setTherapistName] = useState('tu terapeuta');
  const [templateSaved, setTemplateSaved] = useState(false);

  // Push notifications state
  const [pushStatus, setPushStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
  }>({ supported: true, permission: 'default', isSubscribed: false });
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [testPushLoading, setTestPushLoading] = useState(false);

  // Backup state
  const [backupMessage, setBackupMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [isStorageProtected, setIsStorageProtected] = useState(false);

  // Load initial settings
  useEffect(() => {
    getSetting<string>('messageTemplate', DEFAULT_MESSAGE_TEMPLATE).then(t => {
      if (t) setTemplate(t);
    });

    getSetting<string>('therapistName', DEFAULT_THERAPIST_NAME).then(tn => {
      if (tn) setTherapistName(tn);
    });

    getSetting<'system' | 'light' | 'dark'>('theme', 'system').then(th => {
      if (th) {
        setTheme(th);
        applyTheme(th);
      }
    });

    checkPushStatus();
    isStoragePersisted().then(persisted => setIsStorageProtected(persisted));
  }, []);

  const checkPushStatus = async () => {
    const status = await getPushSubscriptionState();
    setPushStatus(status);
  };

  const applyTheme = (mode: 'system' | 'light' | 'dark') => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = async (mode: 'system' | 'light' | 'dark') => {
    setTheme(mode);
    await setSetting('theme', mode);
    applyTheme(mode);
  };

  // Change PIN handler
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (newPin !== confirmNewPin) {
      setPinMessage({ text: 'Los nuevos PINs no coinciden.', isError: true });
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setPinMessage({ text: 'El nuevo PIN debe tener entre 4 y 6 dígitos.', isError: true });
      return;
    }

    try {
      setIsChangingPin(true);
      const res = await changePin(currentPin, newPin);
      if (res.success) {
        setPinMessage({ text: '¡PIN actualizado exitosamente!', isError: false });
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
      } else {
        setPinMessage({ text: res.error || 'No se pudo cambiar el PIN.', isError: true });
      }
    } catch {
      setPinMessage({ text: 'Error al cambiar el PIN.', isError: true });
    } finally {
      setIsChangingPin(false);
    }
  };

  // Save WhatsApp template
  const handleSaveTemplate = async () => {
    await setSetting('messageTemplate', template);
    await setSetting('therapistName', therapistName);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2500);
  };

  const handleResetTemplate = async () => {
    setTemplate(DEFAULT_MESSAGE_TEMPLATE);
    setTherapistName(DEFAULT_THERAPIST_NAME);
    await setSetting('messageTemplate', DEFAULT_MESSAGE_TEMPLATE);
    await setSetting('therapistName', DEFAULT_THERAPIST_NAME);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2500);
  };

  // Push notifications toggle
  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushMessage(null);
    try {
      if (pushStatus.isSubscribed) {
        const res = await unsubscribeFromPushNotifications();
        if (res.success) {
          setPushMessage({ text: 'Notificaciones desactivadas.', isError: false });
        } else {
          setPushMessage({ text: res.error || 'Error al desactivar notificaciones.', isError: true });
        }
      } else {
        const res = await subscribeToPushNotifications();
        if (res.success) {
          setPushMessage({ text: '¡Notificaciones activadas exitosamente!', isError: false });
        } else {
          setPushMessage({ text: res.error || 'Error al activar notificaciones.', isError: true });
        }
      }
      await checkPushStatus();
    } finally {
      setPushLoading(false);
    }
  };

  // Test push notification
  const handleTestPush = async () => {
    setTestPushLoading(true);
    setPushMessage(null);
    try {
      const { deviceId, deviceSecret } = await getOrCreateDeviceCredentials();
      const res = await fetch('/api/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-secret': deviceSecret,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPushMessage({ text: 'Notificación de prueba enviada a tu dispositivo.', isError: false });
      } else {
        setPushMessage({ text: data.error || 'Error al enviar notificación de prueba.', isError: true });
      }
    } catch (err: any) {
      setPushMessage({ text: 'Error de conexión: ' + err.message, isError: true });
    } finally {
      setTestPushLoading(false);
    }
  };

  // Import backup handler
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'ADVERTENCIA: Importar este archivo REEMPLAZARÁ todos los clientes actuales en este dispositivo. ¿Deseas continuar?'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    try {
      setIsImporting(true);
      setBackupMessage(null);
      const res = await importBackup(file);
      if (res.success) {
        setBackupMessage({
          text: `Respaldo importado correctamente (${res.clientCount} clientes restaurados).`,
          isError: false,
        });
      } else {
        setBackupMessage({ text: res.error || 'Error al importar respaldo.', isError: true });
      }
    } catch (err: any) {
      setBackupMessage({ text: 'Error: ' + err.message, isError: true });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      
      {/* 1. Seguridad: Cambio de PIN */}
      <section className="bg-white dark:bg-navy-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-navy-800">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">Cambiar PIN de acceso</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Protege tu agenda con una clave de 4 a 6 dígitos</p>
          </div>
        </div>

        <form onSubmit={handleChangePin} className="space-y-3">
          {pinMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border ${
                pinMessage.isError
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
              }`}
            >
              {pinMessage.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              PIN actual
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nuevo PIN (4-6 dígitos)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Confirmar nuevo PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={confirmNewPin}
                onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPin || !currentPin || !newPin || !confirmNewPin}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-sm"
            >
              {isChangingPin ? 'Actualizando...' : 'Actualizar PIN'}
            </button>
          </div>
        </form>
      </section>

      {/* 2. Plantilla de WhatsApp */}
      <section className="bg-white dark:bg-navy-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-navy-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">Mensaje de WhatsApp para Pacientes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personaliza el saludo y la mención de su tratamiento</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Nombre / Firma del Terapeuta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tu nombre o firma profesional
            </label>
            <input
              type="text"
              value={therapistName}
              onChange={e => setTherapistName(e.target.value)}
              placeholder="Ej. tu terapeuta / Lic. Alessander"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Reemplaza la variable <code className="text-gold-600 dark:text-gold-400 font-semibold">{'{terapeuta}'}</code> en el mensaje.
            </p>
          </div>

          {/* Plantillas sugeridas (Presets) */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Plantillas sugeridas:</p>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTemplate(preset.template)}
                  className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-gold-500/10 hover:text-gold-600 dark:bg-navy-800 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-navy-700 transition"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Editor de plantilla */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Texto del mensaje
            </label>
            <textarea
              rows={3}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Variables: <code className="text-gold-600 dark:text-gold-400 font-semibold">{'{nombre}'}</code>, <code className="text-gold-600 dark:text-gold-400 font-semibold">{'{fecha}'}</code> y <code className="text-gold-600 dark:text-gold-400 font-semibold">{'{terapeuta}'}</code>
            </p>
          </div>

          {/* Vista previa en vivo */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/60 dark:border-emerald-900/60 text-xs">
            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Vista previa del saludo:
            </p>
            <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">
              &quot;{template
                .replace(/{nombre}/gi, 'Mariana')
                .replace(/{fecha}/gi, 'viernes 17 de octubre')
                .replace(/{terapeuta}/gi, therapistName.trim() || 'tu terapeuta')}&quot;
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleResetTemplate}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
            >
              Restaurar predeterminado
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
            >
              {templateSaved ? <Check className="w-4 h-4" /> : null}
              {templateSaved ? 'Guardado' : 'Guardar mensaje'}
            </button>
          </div>
        </div>
      </section>

      {/* 3. Notificaciones Push */}
      <section className="bg-white dark:bg-navy-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-navy-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">Recordatorio diario automático</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recibe una alerta diaria a las 8:00 a.m. (hora de Lima)</p>
          </div>
        </div>

        {pushMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border mb-3 ${
              pushMessage.isError
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
            }`}
          >
            {pushMessage.text}
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-800/60 border border-slate-100 dark:border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-navy-900 dark:text-white">Estado del servicio</span>
              <p className="text-[11px] text-slate-500">
                {pushStatus.isSubscribed ? 'Suscrito y sincronizado' : 'Inactivo en este dispositivo'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading || !pushStatus.supported}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition shadow-sm ${
                pushStatus.isSubscribed
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950 hover:opacity-90'
              }`}
            >
              {pushLoading ? 'Procesando...' : pushStatus.isSubscribed ? 'Desactivar' : 'Activar notificaciones'}
            </button>
          </div>

          {pushStatus.isSubscribed && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-navy-700/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">¿Deseas verificar el aviso ahora?</span>
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testPushLoading}
                className="py-1.5 px-3 rounded-lg text-xs font-semibold text-gold-600 dark:text-gold-400 hover:bg-gold-500/10 transition flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                {testPushLoading ? 'Enviando...' : 'Probar notificación'}
              </button>
            </div>
          )}
        </div>

        {/* Nota para iOS / iPhone */}
        <div className="mt-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Nota para iPhone / iPad:</strong> Las notificaciones push en Apple solo funcionan si agregas la app a la pantalla de inicio (Compartir &rarr; Agregar al inicio, iOS 16.4 o superior).
          </p>
        </div>
      </section>

      {/* 4. Respaldo de datos */}
      <section className="bg-white dark:bg-navy-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-navy-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">Respaldo y restauración</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Guarda una copia segura en tu computadora o transfiérela</p>
          </div>
        </div>

        {backupMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border mb-3 ${
              backupMessage.isError
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
            }`}
          >
            {backupMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Exportar */}
          <button
            type="button"
            onClick={exportBackup}
            className="py-3 px-4 rounded-xl border border-slate-200 dark:border-navy-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-gold-500" />
            Exportar respaldo (JSON)
          </button>

          {/* Importar */}
          <label className="py-3 px-4 rounded-xl border border-slate-200 dark:border-navy-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 flex items-center justify-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-emerald-500" />
            {isImporting ? 'Importando...' : 'Importar respaldo (JSON)'}
            <input
              type="file"
              accept=".json"
              disabled={isImporting}
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 text-center">
          * La importación reemplazará los datos actuales para mantener consistencia.
        </p>
      </section>

      {/* 5. Tema visual */}
      <section className="bg-white dark:bg-navy-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-navy-800">
        <h2 className="text-sm font-bold text-navy-900 dark:text-white mb-1">Apariencia</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Selecciona el modo visual preferido</p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              theme === 'light'
                ? 'bg-gold-500/10 text-gold-600 border-gold-500/40 ring-1 ring-gold-500/40'
                : 'border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4" />
            Claro
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              theme === 'dark'
                ? 'bg-gold-500/10 text-gold-400 border-gold-500/40 ring-1 ring-gold-500/40'
                : 'border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4" />
            Oscuro
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              theme === 'system'
                ? 'bg-gold-500/10 text-gold-500 border-gold-500/40 ring-1 ring-gold-500/40'
                : 'border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Sistema
          </button>
        </div>
      </section>

      {/* 6. Privacidad por diseño y Ley Peruana */}
      <section className="p-5 rounded-3xl bg-slate-100/70 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 text-slate-600 dark:text-slate-400 text-xs space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-navy-900 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Privacidad por diseño (Privacy by Design)</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Los datos confidenciales de tus clientes (nombres, números telefónicos y notas clínicas) <strong>nunca salen de este dispositivo</strong>. Se almacenan cifrados y protegidos en la base de datos local de tu navegador. El servidor en la nube solo procesa identificadores anónimos y fechas para enviar las alertas push.
        </p>

        {/* Blindaje de Almacenamiento Persistente */}
        <div className="pt-2 border-t border-slate-200 dark:border-navy-800 flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Almacenamiento persistente del navegador
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isStorageProtected
                ? 'Activo (Blindado contra borrado automático de caché por el sistema móvil)'
                : 'Estándar (Sujeto a limpieza automática de caché del sistema)'}
            </p>
          </div>
          {!isStorageProtected && (
            <button
              type="button"
              onClick={async () => {
                const ok = await requestPersistentStorage();
                setIsStorageProtected(ok);
              }}
              className="py-1 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex-shrink-0"
            >
              Blindar ahora
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-navy-800 flex items-start gap-2 text-amber-700 dark:text-amber-400 text-[11px]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Ley de Protección de Datos Personales del Perú (Ley N° 29733):</strong> Se recomienda informar y obtener el consentimiento de tus pacientes antes del tratamiento de sus datos de contacto y el envío de recordatorios de sesiones.
          </p>
        </div>
      </section>

    </div>
  );
};
