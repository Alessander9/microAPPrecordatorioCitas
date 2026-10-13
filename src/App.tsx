import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PinSetupModal } from './components/PinSetupModal';
import { PinLockScreen } from './components/PinLockScreen';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { InstallPrompt } from './components/InstallPrompt';
import { Calendar, Settings, Lock } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isInitialized, hasPin, isUnlocked, lock } = useAuth();
  const [activeTab, setActiveTab] = useState<'reminders' | 'settings'>('reminders');

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950">
        <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPin) {
    return <PinSetupModal />;
  }

  if (!isUnlocked) {
    return <PinLockScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 px-4 py-3 bg-white/85 dark:bg-navy-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-navy-800/80">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-navy-900 dark:bg-navy-800 border border-gold-500/40 flex items-center justify-center text-gold-500 shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-navy-900 dark:text-white leading-none">
                Recordatorio de Citas
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Terapia &amp; Consultorio</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={lock}
              className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Bloquear sesión ahora"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Bloquear</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-5">
        {activeTab === 'reminders' ? <RemindersPage /> : <SettingsPage />}
      </main>

      {/* Bottom Navigation Bar (Mobile-first tactile tabs) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-navy-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-navy-800/80 pb-safe">
        <div className="max-w-xl mx-auto flex items-center justify-around py-2">
          
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition active:scale-95 ${
              activeTab === 'reminders'
                ? 'text-navy-900 dark:text-gold-400 font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'reminders' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[11px]">Mis recordatorios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition active:scale-95 ${
              activeTab === 'settings'
                ? 'text-navy-900 dark:text-gold-400 font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[11px]">Ajustes</span>
          </button>

        </div>
      </nav>

      {/* Install Prompt component */}
      <InstallPrompt />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
