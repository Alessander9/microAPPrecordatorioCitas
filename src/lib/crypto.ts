/**
 * Web Crypto API utilities for PIN hashing (PBKDF2) and Device Key generation.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a cryptographically random salt (16 bytes, base64)
 */
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return arrayBufferToBase64(salt.buffer);
}

/**
 * Hashes a PIN using PBKDF2 with SHA-256 and 100,000 iterations
 */
export async function hashPin(pin: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBuffer = base64ToArrayBuffer(saltBase64);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  );

  return arrayBufferToBase64(derivedBits);
}

/**
 * Verifies a PIN against a stored salt and hash
 */
export async function verifyPin(pin: string, saltBase64: string, expectedHash: string): Promise<boolean> {
  try {
    const computedHash = await hashPin(pin, saltBase64);
    return computedHash === expectedHash;
  } catch (err) {
    console.error('Error verifying PIN:', err);
    return false;
  }
}

/**
 * Generates a random cryptographic hex string (used for deviceId & deviceSecret)
 */
export function generateRandomHex(byteCount = 32): string {
  const array = new Uint8Array(byteCount);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes a SHA-256 hash of a string, returned as a hex string.
 */
export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(text));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
