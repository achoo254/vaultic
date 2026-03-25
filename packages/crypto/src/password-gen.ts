// Secure random password generation using crypto.getRandomValues

import type { PasswordGenOptions } from '@vaultic/types';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/** Generate a random password with the given options */
export function generatePassword(options: PasswordGenOptions): string {
  let charset = '';
  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.digits) charset += DIGITS;
  if (options.symbols) charset += SYMBOLS;

  if (charset.length === 0) charset = LOWERCASE + DIGITS;

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  return Array.from(array, (v) => charset[v % charset.length]).join('');
}
