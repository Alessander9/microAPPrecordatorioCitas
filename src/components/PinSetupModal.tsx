import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PinPad } from './PinPad';
import { ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';

export const PinSetupModal: React.FC = () => {
  const { setupPin } = useAuth();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPin = step === 'create' ? firstPin : confirmPin;

  const handleDigit = (digit: string) => {
    setError(null);
    if (step === 'create') {
      if (firstPin.length < 6) {
        setFirstPin(prev => prev + digit);
      }
    } else {
      if (confirmPin.length < 6) {
        setConfirmPin(prev => prev + digit);
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    if (step === 'create') {
      setFirstPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleContinueToConfirm = () => {
    if (firstPin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    setStep('confirm');
    setError(null);
  };

  const handleFinishSetup = async () => {
    if (confirmPin !== firstPin) {
      setError('Los números no coinciden. Inténtalo nuevamente.');
      setConfirmPin('');
      return;
    }

    try {
      setIsSubmitting(true);
      const ok = await setupPin(firstPin);
      if (!ok) {
        setError('Ocurrió un error al configurar el PIN.');
      }
    } catch (err) {
      setError('Error al cifrar el PIN.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('create');
    setFirstPin('');
    setConfirmPin('');
    setError(null);
  };

  // Physical keyboard support (0-9, Backspace, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (step === 'create' && firstPin.length >= 4) {
          handleContinueToConfirm();
        } else if (step === 'confirm' && confirmPin.length >= 4) {
          handleFinishSetup();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, firstPin, confirmPin, isSubmitting]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-800 text-center flex flex-col items-center animate-fade-in">
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-500 flex items-center justify-center mb-4 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-navy-900 dark:text-white">
          {step === 'create' ? 'Configura tu PIN' : 'Confirma tu PIN'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          {step === 'create'
            ? 'Crea un código de 4 a 6 dígitos para proteger las citas de tus clientes.'
            : 'Vuelve a ingresar el código para confirmar.'}
        </p>

        {/* PIN Dots (visual representation) */}
        <div className="flex items-center justify-center gap-3 mb-6 min-h-[32px]">
          {Array.from({ length: Math.max(4, Math.min(6, currentPin.length + 1)) }).map((_, idx) => {
            const isFilled = idx < currentPin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-gold-500 scale-110 shadow-sm shadow-gold-500/50'
                    : 'border-2 border-slate-300 dark:border-navy-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2 w-full animate-shake">
            {error}
          </div>
        )}

        {/* Tactile Keypad */}
        <PinPad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={isSubmitting}
        />

        {/* Action Controls */}
        <div className="w-full flex items-center justify-between gap-3 mt-2">
          {step === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar
              </button>
              <button
                type="button"
                onClick={handleFinishSetup}
                disabled={confirmPin.length < 4 || isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Guardando...' : 'Completar'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleContinueToConfirm}
              disabled={firstPin.length < 4}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-navy-900 dark:bg-gold-500 dark:text-navy-950 hover:bg-navy-800 dark:hover:bg-gold-400 disabled:opacity-40 transition shadow-md flex items-center justify-center gap-2"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
