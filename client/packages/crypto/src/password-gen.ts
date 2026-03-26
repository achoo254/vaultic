// Secure random password generation using crypto.getRandomValues

import type { PasswordGenOptions } from '@vaultic/types';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/** Pick a uniform random index from charset using rejection sampling (no modulo bias) */
function uniformRandomIndex(charsetLength: number): number {
  // Find the largest multiple of charsetLength that fits in Uint32
  const max = Math.floor(0x100000000 / charsetLength) * charsetLength;
  const buf = new Uint32Array(1);
  // Reject values that would cause modulo bias
  let val: number;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= max);
  return val % charsetLength;
}

/** Generate a random password with the given options */
export function generatePassword(options: PasswordGenOptions): string {
  let charset = '';
  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.digits) charset += DIGITS;
  if (options.symbols) charset += SYMBOLS;

  if (charset.length === 0) charset = LOWERCASE + DIGITS;

  const result: string[] = [];
  for (let i = 0; i < options.length; i++) {
    result.push(charset[uniformRandomIndex(charset.length)]);
  }
  return result.join('');
}
