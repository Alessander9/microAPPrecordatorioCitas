import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSetting, setSetting } from '../db/db';
import { generateSalt, hashPin, verifyPin } from '../lib/crypto';

interface AuthContextType {
  isInitialized: boolean;
  hasPin: boolean;
  isUnlocked: boolean;
  failedAttempts: number;
  lockUntil: number | null;
  setupPin: (pin: string) => Promise<boolean>;
  unlock: (pin: string) => Promise<{ success: boolean; error?: string; remainingLockSeconds?: number }>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  lock: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30 * 1000; // 30 seconds
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  // Session unlocked state lives strictly in memory!
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const inactivityTimerRef = useRef<number | null>(null);
  const wasHiddenRef = useRef<boolean>(false);

  // Load initial PIN status and lock status from Dexie
  const loadAuthStatus = useCallback(async () => {
    try {
      const pinHash = await getSetting<string>('pinHash');
      const storedAttempts = (await getSetting<number>('failedAttempts')) || 0;
      const storedLockUntil = (await getSetting<number>('lockUntil')) || null;

      setHasPin(Boolean(pinHash));
      setFailedAttempts(storedAttempts);

      if (storedLockUntil && storedLockUntil > Date.now()) {
        setLockUntil(storedLockUntil);
      } else {
        setLockUntil(null);
      }
    } catch (err) {
      console.error('Error loading auth status:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  // Lock function
  const lock = useCallback(() => {
    setIsUnlocked(false);
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    if (isUnlocked) {
      inactivityTimerRef.current = window.setTimeout(() => {
        lock();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isUnlocked, lock]);

  // Inactivity tracking
  useEffect(() => {
    if (!isUnlocked) return;

    resetInactivityTimer();

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'mousemove', 'scroll'];
    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [isUnlocked, resetInactivityTimer]);

  // Lock when returning from background / visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
      } else if (document.visibilityState === 'visible') {
        if (wasHiddenRef.current) {
          wasHiddenRef.current = false;
          // Auto-lock when returning from background
          lock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lock]);

  // Setup PIN for the first time
  const setupPin = async (pin: string): Promise<boolean> => {
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return false;
    }
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);

    await setSetting('pinSalt', salt);
    await setSetting('pinHash', hash);
    await setSetting('failedAttempts', 0);
    await setSetting('lockUntil', null);

    setHasPin(true);
    setFailedAttempts(0);
    setLockUntil(null);
    setIsUnlocked(true); // Automatically unlocked upon creation
    return true;
  };

  // Unlock with PIN
  const unlock = async (
    pin: string
  ): Promise<{ success: boolean; error?: string; remainingLockSeconds?: number }> => {
    // Check if locked out
    if (lockUntil && lockUntil > Date.now()) {
      const remainingSeconds = Math.ceil((lockUntil - Date.now()) / 1000);
      return {
        success: false,
        error: `Acceso bloqueado por seguridad. Espera ${remainingSeconds} segundos.`,
        remainingLockSeconds: remainingSeconds,
      };
    }

    const pinHash = await getSetting<string>('pinHash');
    const pinSalt = await getSetting<string>('pinSalt');

    if (!pinHash || !pinSalt) {
      return { success: false, error: 'No se ha configurado ningún PIN.' };
    }

    const isValid = await verifyPin(pin, pinSalt, pinHash);

    if (isValid) {
      // Reset failed attempts
      await setSetting('failedAttempts', 0);
      await setSetting('lockUntil', null);
      setFailedAttempts(0);
      setLockUntil(null);
      setIsUnlocked(true);
      return { success: true };
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      await setSetting('failedAttempts', newAttempts);

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Multiplier for repeated lockouts
        const multiplier = Math.max(1, newAttempts - MAX_FAILED_ATTEMPTS + 1);
        const lockDuration = BASE_LOCKOUT_MS * multiplier;
        const newLockUntil = Date.now() + lockDuration;
        setLockUntil(newLockUntil);
        await setSetting('lockUntil', newLockUntil);
        const remainingSeconds = Math.ceil(lockDuration / 1000);
        return {
          success: false,
          error: `5 intentos fallidos alcanzados. Bloqueado temporalmente por ${remainingSeconds} segundos.`,
          remainingLockSeconds: remainingSeconds,
        };
      }

      const remainingAttempts = MAX_FAILED_ATTEMPTS - newAttempts;
      return {
        success: false,
        error: `PIN incorrecto. Te quedan ${remainingAttempts} intento(s) antes del bloqueo temporal.`,
      };
    }
  };

  // Change PIN
  const changePin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const pinHash = await getSetting<string>('pinHash');
    const pinSalt = await getSetting<string>('pinSalt');

    if (!pinHash || !pinSalt) {
      return { success: false, error: 'No hay un PIN configurado.' };
    }

    const isValid = await verifyPin(currentPin, pinSalt, pinHash);
    if (!isValid) {
      return { success: false, error: 'El PIN actual no es correcto.' };
    }

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return { success: false, error: 'El nuevo PIN debe tener entre 4 y 6 dígitos numéricos.' };
    }

    const newSalt = generateSalt();
    const newHash = await hashPin(newPin, newSalt);

    await setSetting('pinSalt', newSalt);
    await setSetting('pinHash', newHash);

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        hasPin,
        isUnlocked,
        failedAttempts,
        lockUntil,
        setupPin,
        unlock,
        changePin,
        lock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
