// Tests for secure password generation
import { describe, it, expect } from 'vitest';
import { generatePassword } from '../password-gen';

describe('generatePassword', () => {
  it('respects requested length', () => {
    const pw = generatePassword({ length: 20, uppercase: true, lowercase: true, digits: true, symbols: false });
    expect(pw.length).toBe(20);
  });

  it('includes uppercase when enabled', () => {
    const pw = generatePassword({ length: 50, uppercase: true, lowercase: false, digits: false, symbols: false });
    expect(pw).toMatch(/^[A-Z]+$/);
  });

  it('includes lowercase when enabled', () => {
    const pw = generatePassword({ length: 50, uppercase: false, lowercase: true, digits: false, symbols: false });
    expect(pw).toMatch(/^[a-z]+$/);
  });

  it('includes digits when enabled', () => {
    const pw = generatePassword({ length: 50, uppercase: false, lowercase: false, digits: true, symbols: false });
    expect(pw).toMatch(/^[0-9]+$/);
  });

  it('includes symbols when enabled', () => {
    const pw = generatePassword({ length: 50, uppercase: false, lowercase: false, digits: false, symbols: true });
    expect(pw).toMatch(/^[^a-zA-Z0-9]+$/);
  });

  it('falls back to lowercase+digits when all options disabled', () => {
    const pw = generatePassword({ length: 30, uppercase: false, lowercase: false, digits: false, symbols: false });
    expect(pw).toMatch(/^[a-z0-9]+$/);
  });

  it('generates different passwords each time', () => {
    const opts = { length: 20, uppercase: true, lowercase: true, digits: true, symbols: true };
    const pw1 = generatePassword(opts);
    const pw2 = generatePassword(opts);
    // With 20 chars from ~80 charset, collision probability is astronomically low
    expect(pw1).not.toBe(pw2);
  });
});
