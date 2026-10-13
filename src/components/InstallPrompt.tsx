import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (isStandalone || !deferredPrompt || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto bg-navy-900 dark:bg-navy-800 text-white p-3.5 rounded-2xl shadow-xl border border-gold-500/30 flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold leading-tight">Instalar app en tu móvil</p>
          <p className="text-[11px] text-slate-300">Acceso rápido sin conexión a tus citas</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="py-1.5 px-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold transition shadow-sm"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          aria-label="Cerrar aviso de instalación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
