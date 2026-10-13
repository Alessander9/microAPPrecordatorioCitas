import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PinPad } from './PinPad';
import { Lock, AlertCircle, Clock } from 'lucide-react';

export const PinLockScreen: React.FC = () => {
  const { unlock, lockUntil } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Check lockout countdown
  useEffect(() => {
    const updateCountdown = () => {
      if (lockUntil && lockUntil > Date.now()) {
        const secs = Math.ceil((lockUntil - Date.now()) / 1000);
        setRemainingSeconds(secs);
      } else {
        setRemainingSeconds(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const handleDigit = (digit: string) => {
    if (remainingSeconds > 0) return;
    setError(null);
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (remainingSeconds > 0) return;
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleUnlock = async () => {
    if (pin.length < 4 || remainingSeconds > 0 || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      const res = await unlock(pin);
      if (!res.success) {
        setError(res.error || 'PIN incorrecto.');
        setPin('');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al verificar el PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  // Physical keyboard support (0-9, Backspace, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (remainingSeconds > 0 || isLoading) return;
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < 6) {
          setError(null);
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setError(null);
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleUnlock();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [remainingSeconds, isLoading, pin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-navy-950">
      <div className="w-full max-w-sm bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-800 text-center flex flex-col items-center">
        
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-navy-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-navy-800 dark:text-gold-400 flex items-center justify-center mb-3 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-navy-900 dark:text-white">
          Recordatorio de Citas
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Ingresa tu PIN de seguridad para acceder a la agenda
        </p>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3 mb-6 min-h-[32px]">
          {Array.from({ length: 6 }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-gold-500 scale-125 shadow-sm shadow-gold-500/50'
                    : 'border-2 border-slate-300 dark:border-navy-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Lockout status banner */}
        {remainingSeconds > 0 ? (
          <div className="mb-4 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-2.5 w-full flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Bloqueo activo: espera {remainingSeconds}s</span>
          </div>
        ) : error ? (
          <div className="mb-4 text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2 w-full flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Keypad */}
        <PinPad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={remainingSeconds > 0 || isLoading}
        />

        {/* Unlock Button */}
        <div className="w-full mt-2">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={pin.length < 4 || remainingSeconds > 0 || isLoading}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-md flex items-center justify-center gap-2"
          >
            {isLoading ? 'Verificando...' : 'Desbloquear'}
          </button>
        </div>
      </div>
    </div>
  );
};
