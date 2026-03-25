// Crypto-related types

export interface DerivedKeys {
  encryption_key: CryptoKey;
  auth_hash: string;
}

export interface EncryptedPayload {
  /** Base64-encoded IV + ciphertext */
  data: string;
}

export interface PasswordGenOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}
